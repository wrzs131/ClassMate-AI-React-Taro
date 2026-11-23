"""运行时配置：硅基流动模型、路径与开关。"""
from dataclasses import dataclass
from pathlib import Path
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

STORAGE_DIR = BASE_DIR / "storage"
SEED_DIR = BASE_DIR / "seed"
EXPORT_DIR = STORAGE_DIR / "exports"
UPLOAD_DIR = STORAGE_DIR / "uploads"
CHROMA_DIR = STORAGE_DIR / "chroma"
DB_PATH = STORAGE_DIR / "app.db"

for _p in (STORAGE_DIR, EXPORT_DIR, UPLOAD_DIR, CHROMA_DIR):
    _p.mkdir(parents=True, exist_ok=True)


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass
class Settings:
    api_key: str = os.getenv("api_key", os.getenv("API_KEY", ""))
    base_url: str = os.getenv("base_url", "https://api.siliconflow.cn/v1").rstrip("/")
    model_name: str = os.getenv("model_name", "Qwen/Qwen3-VL-32B-Instruct")
    embedding_model: str = os.getenv("embedding_model", "Qwen/Qwen3-Embedding-8B")
    temperature: float = float(os.getenv("temperature", "0.3"))
    max_tokens: int = int(os.getenv("max_tokens", "4096"))
    request_timeout: int = int(os.getenv("request_timeout", "120"))
    use_llm: bool = _bool("use_llm", True)
    # 本地向量检索：embedding 存 SQLite（chunk_embeddings 表），numpy 余弦相似度暴力检索，
    # 不依赖 chromadb 的二进制；embedding 服务不可用时自动降级为关键词 bigram。
    enable_vector: bool = _bool("enable_vector", True)
    host: str = os.getenv("host", "0.0.0.0")
    port: int = int(os.getenv("port", "8001"))

    @property
    def llm_ready(self) -> bool:
        return bool(self.use_llm and self.api_key and self.api_key.startswith("sk-"))


settings = Settings()
