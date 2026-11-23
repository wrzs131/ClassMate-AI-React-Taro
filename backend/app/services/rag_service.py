"""知识空间、文档解析、向量检索（SQLite 本地存储）与关键词兜底。

向量方案：chunks 的 embedding 以 JSON 存在 chunk_embeddings 表，检索时全量载入后做
numpy 余弦相似度。演示规模（几百条）下暴力检索足够快，且不依赖 chromadb 的
C/Rust 二进制（Windows 上曾触发 0xC0000005 崩溃），embedding 调用失败自动降级为关键词 bigram。
"""
from __future__ import annotations

import json
import re
import sys
import uuid
from pathlib import Path
from typing import Any, Optional

from .. import db
from ..config import settings
from ..db import dumps, loads
from ..llm import llm

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except Exception as exc:  # pragma: no cover
    RecursiveCharacterTextSplitter = None  # type: ignore
    print(f"[RAG] 文本分块依赖不可用: {exc}", file=sys.stderr)

try:
    import numpy as np
except Exception as exc:  # pragma: no cover
    np = None  # type: ignore
    print(f"[RAG] numpy 不可用，向量检索将自动降级为关键词: {exc}", file=sys.stderr)

EMBED_BATCH = 16


def _read_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if suffix == ".docx":
        from docx import Document

        document = Document(str(path))
        parts = [p.text for p in document.paragraphs]
        for table in document.tables:
            for row in table.rows:
                parts.append(" | ".join(cell.text for cell in row.cells))
        return "\n".join(parts)
    raw = path.read_bytes()
    for encoding in ("utf-8", "gb18030", "gbk"):
        try:
            return raw.decode(encoding)
        except Exception:
            continue
    return raw.decode("utf-8", errors="ignore")


def _split_text(text: str, size: int = 520, overlap: int = 80) -> list[str]:
    text = re.sub(r"\r\n", "\n", text).strip()
    if not text:
        return []
    if RecursiveCharacterTextSplitter is not None:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=size,
            chunk_overlap=overlap,
            separators=["\n\n", "\n", "。", "；", "！", "？", "，", " "],
        )
        return [c.page_content for c in splitter.create_documents([text]) if c.page_content.strip()]
    chunks = []
    start = 0
    while start < len(text):
        chunks.append(text[start : start + size])
        start += max(1, size - overlap)
    return chunks


def _bigrams(text: str) -> set[str]:
    text = re.sub(r"[^\u4e00-\u9fa5a-zA-Z0-9+\-*/×÷=<>|()（）.]", "", text)
    if len(text) <= 2:
        return {text} if text else set()
    return {text[i : i + 2] for i in range(len(text) - 1)}


class RagService:
    def list_spaces(self, kind: Optional[str] = None) -> list[dict]:
        if kind:
            return db.query("SELECT * FROM knowledge_spaces WHERE kind=? ORDER BY created_at", (kind,))
        return db.query("SELECT * FROM knowledge_spaces ORDER BY kind, created_at")

    def get_space(self, space_id: str) -> Optional[dict]:
        return db.query_one("SELECT * FROM knowledge_spaces WHERE id=?", (space_id,))

    def create_space(self, kind: str, name: str, subject: str, grade: str, version: str, description: str) -> dict:
        space_id = f"space_{uuid.uuid4().hex[:10]}"
        db.execute(
            "INSERT INTO knowledge_spaces(id, kind, name, subject, grade, textbook_version, description, created_at) "
            "VALUES(?,?,?,?,?,?,?,?)",
            (space_id, kind, name, subject, grade, version, description, db.now_ms()),
        )
        return self.get_space(space_id) or {}

    def delete_document(self, document_id: str) -> dict:
        """删除文档及其全部分块（向量库关闭时无需额外清理，重新索引即可重建）。"""
        doc = db.query_one("SELECT * FROM documents WHERE id=?", (document_id,))
        if not doc:
            raise ValueError("文档不存在")
        db.execute("DELETE FROM chunks WHERE document_id=?", (document_id,))
        db.execute("DELETE FROM documents WHERE id=?", (document_id,))
        path = doc.get("file_path") or ""
        if path:
            try:
                Path(path).unlink(missing_ok=True)
            except OSError:
                pass
        return {"id": document_id, "name": doc.get("name") or "", "chunk_count": doc.get("chunk_count") or 0}

    def list_documents(self, space_id: str) -> list[dict]:
        return db.query("SELECT * FROM documents WHERE space_id=? ORDER BY created_at DESC", (space_id,))

    def ingest_file(self, space_id: str, path: Path, original_name: str) -> dict:
        space = self.get_space(space_id)
        if not space:
            raise ValueError("知识空间不存在")
        doc_id = f"doc_{uuid.uuid4().hex[:10]}"
        text = _read_text(path)
        chunks = _split_text(text)
        if not chunks:
            raise ValueError("文档中没有可解析的文字")
        db.execute(
            "INSERT INTO documents(id, space_id, name, file_path, file_type, chunk_count, embedded, status, created_at) "
            "VALUES(?,?,?,?,?,?,?,?,?)",
            (doc_id, space_id, original_name, str(path), path.suffix.lower().lstrip("."), len(chunks), 0, "ready", db.now_ms()),
        )
        for idx, content in enumerate(chunks):
            chunk_id = f"{doc_id}_{idx:02d}"
            metadata = {
                "kind": space["kind"],
                "kp": space.get("subject", ""),
                "source": original_name,
                "document_id": doc_id,
                "space_id": space_id,
            }
            db.execute(
                "INSERT INTO chunks(id, space_id, document_id, content, metadata) VALUES(?,?,?,?,?)",
                (chunk_id, space_id, doc_id, content, dumps(metadata)),
            )
        try:
            self._embed_space(space_id)
            db.execute("UPDATE documents SET embedded=1 WHERE id=?", (doc_id,))
        except Exception as exc:
            print(f"[RAG] 文档已入库，向量化失败（仍可关键词检索）: {exc}", file=sys.stderr)
        return {
            "id": doc_id,
            "space_id": space_id,
            "name": original_name,
            "chunk_count": len(chunks),
            "status": "ready",
        }

    def import_exams(self, space_id: str, items: list[Any]) -> list[str]:
        ids = []
        for item in items:
            data = item.model_dump() if hasattr(item, "model_dump") else dict(item)
            exam_id = data.get("id") or f"exam_{uuid.uuid4().hex[:10]}"
            data["id"] = exam_id
            db.execute(
                "INSERT OR REPLACE INTO exam_items(id, space_id, subject, grade, kp, qtype, difficulty, stem, options, "
                "answer, analysis, source, source_type, year, region, derived_from, created_at) "
                "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    exam_id,
                    space_id,
                    data.get("subject", "数学"),
                    data.get("grade", "七年级"),
                    data["kp"],
                    data.get("qtype", "choice"),
                    data.get("difficulty", "medium"),
                    data["stem"],
                    dumps(data.get("options", [])),
                    data["answer"],
                    data.get("analysis", ""),
                    data.get("source", ""),
                    data.get("source_type", "sample_adapted"),
                    data.get("year", ""),
                    data.get("region", ""),
                    data.get("derived_from", ""),
                    db.now_ms(),
                ),
            )
            db.execute(
                "INSERT OR REPLACE INTO chunks(id, space_id, document_id, content, metadata) VALUES(?,?,?,?,?)",
                (
                    f"examchunk_{exam_id}",
                    space_id,
                    "",
                    f"【{data['kp']}·{data.get('difficulty', 'medium')}】{data['stem']}\n答案：{data['answer']}\n解析：{data.get('analysis', '')}",
                    dumps(
                        {
                            "kind": "exam",
                            "kp": data["kp"],
                            "difficulty": data.get("difficulty", "medium"),
                            "exam_item_id": exam_id,
                            "source": data.get("source", ""),
                            "source_type": data.get("source_type", ""),
                            "space_id": space_id,
                        }
                    ),
                ),
            )
            ids.append(exam_id)
        try:
            self._embed_space(space_id)
        except Exception as exc:
            print(f"[RAG] 真题已入库，向量化失败（仍可关键词检索）: {exc}", file=sys.stderr)
        return ids

    def _embed_texts(self, texts: list[str]) -> Optional[list[list[float]]]:
        """批量向量化；embedding 服务不可用时返回 None，调用方降级为关键词检索。"""
        embeddings = llm.embeddings()
        if embeddings is None or not texts:
            return None
        return embeddings.embed_documents(texts)

    def _embed_query(self, query: str) -> Optional[list[float]]:
        embeddings = llm.embeddings()
        if embeddings is None:
            return None
        return embeddings.embed_query(query)

    def _embed_space(self, space_id: str, force: bool = False) -> int:
        """给空间内还没有向量的 chunk 生成 embedding 并写入 SQLite，返回新增条数。"""
        if force:
            db.execute("DELETE FROM chunk_embeddings WHERE space_id=?", (space_id,))
        done = {row["chunk_id"] for row in db.query("SELECT chunk_id FROM chunk_embeddings WHERE space_id=?", (space_id,))}
        rows = [row for row in db.query("SELECT id, content FROM chunks WHERE space_id=?", (space_id,)) if row["id"] not in done]
        if not rows:
            return 0
        vectors: list[list[float]] = []
        for start in range(0, len(rows), EMBED_BATCH):
            batch = self._embed_texts([row["content"] for row in rows[start : start + EMBED_BATCH]])
            if batch is None:
                raise RuntimeError("embedding 服务不可用")
            vectors.extend(batch)
        if not vectors:
            return 0
        dim = len(vectors[0])
        now = db.now_ms()
        db.execute_many(
            "INSERT OR REPLACE INTO chunk_embeddings(chunk_id, space_id, dim, embedding, updated_at) VALUES(?,?,?,?,?)",
            (
                (row["id"], space_id, dim, dumps([round(float(v), 6) for v in vec]), now)
                for row, vec in zip(rows, vectors)
            ),
        )
        return len(vectors)

    def reindex_all(self, only_unembedded: bool = True) -> dict:
        spaces = self.list_spaces()
        result = {}
        if not settings.enable_vector:
            return {space["id"]: "skipped_vector_disabled" for space in spaces}
        for space in spaces:
            if llm.embeddings() is None:
                result[space["id"]] = "skipped_no_embeddings"
                continue
            try:
                count = self._embed_space(space["id"], force=not only_unembedded)
                result[space["id"]] = f"ok:{count}" if count else "ok"
            except Exception as exc:
                result[space["id"]] = f"failed: {exc}"
        return result

    def _vector_search(
        self,
        query_vec: list[float],
        spaces: list[dict],
        kp: Optional[str],
        top_k: int,
    ) -> list[dict]:
        if np is None:
            return []
        dim = len(query_vec)
        q = np.asarray(query_vec, dtype="float32")
        norm_q = float(np.linalg.norm(q)) or 1.0
        hits: list[dict] = []
        for space in spaces:
            rows = db.query(
                "SELECT e.chunk_id, e.dim, e.embedding, c.content, c.metadata FROM chunk_embeddings e "
                "JOIN chunks c ON c.id=e.chunk_id WHERE e.space_id=?",
                (space["id"],),
            )
            for row in rows:
                if int(row["dim"] or 0) != dim:
                    continue  # 模型/维度变了的老向量不参与，重建索引后自动恢复
                meta = loads(row["metadata"], {})
                if kp and kp not in str(meta.get("kp", "")) and kp not in row["content"]:
                    continue
                vec = np.asarray(loads(row["embedding"], []), dtype="float32")
                if vec.size != dim:
                    continue
                score = float(np.dot(q, vec) / (norm_q * (float(np.linalg.norm(vec)) or 1.0)))
                hits.append(
                    {
                        "chunk_id": row["chunk_id"],
                        "content": row["content"],
                        "score": round(score, 4),
                        "source": meta.get("source", ""),
                        "kind": meta.get("kind", space["kind"]),
                        "metadata": meta,
                    }
                )
        hits.sort(key=lambda h: h["score"], reverse=True)
        return hits[:top_k]

    def _keyword_search(self, query: str, spaces: list[dict], kp: Optional[str], top_k: int) -> list[dict]:
        hits: list[dict] = []
        sql_parts = []
        params: list[Any] = []
        if spaces:
            placeholders = ",".join("?" for _ in spaces)
            sql_parts.append(f"space_id IN ({placeholders})")
            params.extend([s["id"] for s in spaces])
        sql = "SELECT id, space_id, content, metadata FROM chunks"
        if sql_parts:
            sql += " WHERE " + " AND ".join(sql_parts)
        rows = db.query(sql, params)
        query_grams = _bigrams(query)
        for row in rows:
            meta = loads(row["metadata"], {})
            if kp and kp not in str(meta.get("kp", "")) and kp not in row["content"]:
                continue
            grams = _bigrams(row["content"])
            overlap = len(query_grams & grams)
            if overlap == 0:
                continue
            score = overlap / max(1, len(query_grams))
            if kp and kp in row["content"]:
                score += 0.2
            hits.append(
                {
                    "chunk_id": row["id"],
                    "content": row["content"],
                    "score": round(score, 4),
                    "source": meta.get("source", ""),
                    "kind": meta.get("kind", ""),
                    "metadata": meta,
                }
            )
        hits.sort(key=lambda h: h["score"], reverse=True)
        return hits[:top_k]

    def search(self, query: str, space_ids: list[str] | None = None, kind: str | None = None, kp: str | None = None, top_k: int = 5) -> list[dict]:
        query = (query or "").strip()
        if not query:
            return []
        spaces = self.list_spaces()
        if space_ids:
            spaces = [s for s in spaces if s["id"] in space_ids]
        if kind:
            spaces = [s for s in spaces if s["kind"] == kind]

        hits: list[dict] = []
        seen: set[str] = set()
        if settings.enable_vector and np is not None and llm.embeddings() is not None:
            try:
                query_vec = self._embed_query(query)
            except Exception as exc:
                print(f"[RAG] 查询向量化失败，降级关键词: {exc}", file=sys.stderr)
                query_vec = None
            if query_vec:
                try:
                    hits = self._vector_search(query_vec, spaces, kp, top_k)
                except Exception as exc:
                    print(f"[RAG] 向量检索失败，降级关键词: {exc}", file=sys.stderr)
                    hits = []
                hits = [h for h in hits if not (h["chunk_id"] in seen or seen.add(h["chunk_id"]))]
                seen = {h["chunk_id"] for h in hits}

        # 召回不足时用关键词补齐（向量库为空/失败时则完全靠它）
        if len(hits) < top_k:
            keyword_hits = self._keyword_search(query, spaces, kp, top_k * 2)
            for hit in keyword_hits:
                if hit["chunk_id"] in seen:
                    continue
                seen.add(hit["chunk_id"])
                hits.append(hit)
                if len(hits) >= top_k:
                    break
        return hits[:top_k]


rag_service = RagService()
