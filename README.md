![1](./fronted-UI/10.png)

# ClassMate AI 课堂助教平台（React + Taro 版）

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white" alt="Vue 3"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 18"/>
  <img src="https://img.shields.io/badge/Taro-4-3178C6?style=flat-square" alt="Taro 4"/>
  <img src="https://img.shields.io/badge/NutUI_React-学生端UI-CC0000?style=flat-square&logo=jdnutui&logoColor=white" alt="NutUI-React"/>
  <img src="https://img.shields.io/badge/Element_Plus-教师端UI-409EFF?style=flat-square" alt="Element Plus"/>
  <img src="https://img.shields.io/badge/FastAPI-异步后端-05998B?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/LangChain-1.x-1C3C3C?style=flat-square&logo=langchain&logoColor=white" alt="LangChain"/>
  <img src="https://img.shields.io/badge/RAG-向量检索(SQLite+numpy)-FF6B35" alt="RAG"/>
  <img src="https://img.shields.io/badge/Qwen3_VL-32B-6F42C1?style=flat-square&logo=alibabacloud&logoColor=white" alt="Qwen3-VL"/>
  <img src="https://img.shields.io/badge/MCP-16个工具-000000?style=flat-square&logo=modelcontextprotocol&logoColor=white" alt="MCP"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.13"/>
</p>
面向中小学交互式课堂的多智能体 AI 助教平台：**React 18 + Taro 4 + NutUI-React（学生端小程序）+ Vue3 + Element Plus（教师端 Web）+ FastAPI + LangChain + RAG 向量检索 + 硅基流动 Qwen3-VL + MCP 工具**。
以教师为中心，覆盖「课件辅助生成 → 课堂互动答疑 → 随堂测验批改 → 学情诊断」完整闭环。
教师端内置 **MCP 工具助手**：一句自然语言即可查询、增删改课件 / 题库 / 课堂 / 学情数据；教师提问与学生答疑均接入 **RAG 知识库向量检索**，回答自动标注引用来源。

---

## 1. 与 OpenMAIC 的差异

| OpenMAIC 的痛点 | 本平台的做法 |
| --- | --- |
| 课件题目不全面、过于简单，缺少真题 | **RAG 真题库** + **Grounding Validator**：题目只能取自已入库的 `exam_items`，禁止模型编造出处；参考试卷题优先，代码层强制易/中/难配比 |
| 讲解偏理论、学生听不懂 | 每页讲稿固定为**四段式**：生活类比 → 分步推导 → 易错点/反例 → 真题应用；可在教师端逐页编辑 |
| 只会套理论，实际做题还是不会 | **苏格拉底式分级提示 L0~L3**（首轮不直接给答案）+ **步骤级批改**（错因归类、掌握度 EMA）+ **同知识点真题推荐** + **学情画像** |

账号体系为「**账号 + 密码登录**」，学生再输入 **6 位课堂码**入班（课堂码唯一、仅进行中的课堂有效）。

---

## 2. 功能一览

### 教师端（Web）

| 模块        | 能力                                                         |
| ----------- | ------------------------------------------------------------ |
| 登录 / 注册 | 账号密码登录，教师与学生角色隔离                             |
| 备课工作台  | 输入学科、年级、教材版本、章节 → 生成课件；每页含四段式讲稿、题锚点（难度 + 来源）、RAG 引用片段；支持逐页编辑、导出 PPTX / JSON |
| 授课控制台  | 一键开课并生成 6 位课堂码；「下一步（多智能体推进）」可选同时推送随堂测验；实时课堂看板；生成课堂总结；关闭课堂并用同一课件开启下一堂 |
| 学情诊断    | 班级概览、知识点掌握条、错因分布、学生画像与最近作答明细、推荐练习 |
| 知识库      | 知识空间管理、教材 / 试卷上传、参考试卷题导入、语义检索、题库来源与解析查看 |
| AI 助手（MCP） | 一句话调用 16 个 MCP 工具（查询 8 / 写入 5 / 删除 3）；删除需二次确认；**回答自动做知识库 RAG 向量召回并展示引用来源**；历史对话按教师账号分组保存 |

### 学生端（小程序 / H5：React + Taro）

| 模块        | 能力                                                         |
| ----------- | ------------------------------------------------------------ |
| 登录 / 注册 | 账号密码登录                                                 |
| 首页        | 输入 6 位课堂码入班；按账号隔离保存「加入的课堂」；课堂已关闭 / 已结束状态自动校验 |
| 互动课堂    | 当前页讲稿；文字提问或**拍照提问**（Qwen3-VL 识图）；分级提示逐层展开；**回答下方展示知识库引用来源**；随堂测验入口 |
| 随堂测验    | 选择 / 填空题作答、答题进度、交卷秒回                        |
| 答题报告    | 得分与正确率、逐题步骤反馈与错因、知识点掌握度、推荐同知识点真题 |
| 我的学情    | 个人认知画像、薄弱知识点与练习建议                           |

---

## 3. 技术栈

- 后端：FastAPI、SQLite（标准库 sqlite3，WAL）、PBKDF2 密码 + Bearer Token；Python 3.13
- 模型：LangChain `ChatOpenAI` / `OpenAIEmbeddings` → 硅基流动 OpenAI 兼容接口
  - 对话/图片识别：`Qwen/Qwen3-VL-32B-Instruct`（支持学生拍题上传，base64 识图）
  - 嵌入：`Qwen/Qwen3-Embedding-8B`（1024 维）
- **RAG 检索：SQLite 本地向量库**（`chunk_embeddings` 表存 JSON 向量 + numpy 余弦相似度暴力检索），向量化 16 条一批入库；召回不足或 embedding 服务不可用时自动降级为**关键词 bigram 检索**，功能不缺失（不依赖 Chroma，规避了 `chromadb` 在 Windows/Python3.13 下的原生崩溃问题）
- 教师端 Web：`web/`（**Vue3 + Vite + TypeScript + Element Plus**）
- **学生端小程序：`frontend/`（React 18 + Taro 4 + Vite + Sass + NutUI-React `@nutui/nutui-react-taro`）**
  - 主包：`pages/login`、`pages/home`；分包：`packageClass`（classroom / quiz / report / me），减小主包体积
  - 公共组件 `src/components/ui.tsx`：Tag / CollapseItem / LoadMore / **LazyImage（课堂讲稿配图懒加载，进入视口才请求）**
  - 内置 Vite 插件 `patchNutuiCssForWxss`（`config/index.ts`）：构建期把 NutUI 样式中的 `calc` 乘法、通配符 / `:root` / `[dir=rtl]` 选择器改写为 WXSS 兼容写法，解决微信端「WXSS 编译错误 error at token *」导致样式全丢的问题
- 实时：教师端 SSE（`/api/classroom/{id}/stream`）+ 学生端 5 秒轮询（`useDidShow` 进入轮询 / `useDidHide` 清理）
- MCP：`FastMCP` 注册 16 个工具，以 Streamable HTTP 挂载在 `/mcp`；助手同进程调用，模型侧走 OpenAI function calling（同时兼容 Qwen3-VL 的 `<tool_call>` 文本协议）
- 导出：python-pptx 生成 PPTX（讲稿写入备注页）

---

## 4. 目录结构

```
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── api/             # 路由：auth / rag / courseware / classroom / quiz / diagnosis / settings / assistant
│   │   ├── services/        # rag / courseware / classroom / quiz / question_bank / diagnosis / event_bus
│   │   ├── agents.py        # 六个智能体：备课 / 教师 / 学生 / 助教 / 批改 / 诊断（含离线确定性脚本）
│   │   ├── mcp_server.py    # MCP Server：16 个工具（查询 8 / 写入 5 / 删除 3），挂载 /mcp
│   │   ├── agent.py         # AI 助手编排 + 教师提问 RAG 检索（回答带 sources 引用来源）
│   │   ├── llm.py           # 硅基流动客户端 + JSON 契约修复
│   │   ├── db.py            # 建表 / 轻量迁移（WAL，含 chunk_embeddings 向量表）
│   │   ├── security.py      # PBKDF2 密码 + Bearer Token
│   │   ├── schemas.py       # 请求与响应契约
│   │   ├── json_utils.py    # 答案等价判定（分数 / 多解「或」/ 多空）
│   │   ├── seed.py          # 首次启动写入演示数据
│   │   └── main.py
│   ├── seed/                # 教材片段 + 44 道题（含 OCR 参考试卷题）
│   ├── scripts/             # 自检与演示脚本
│   ├── tests/               # pytest 后端测试（23 项）
│   ├── requirements.txt
│   ├── run.py
│   └── .env.example
├── web/                     # 教师端（Vue3 + Element Plus）
├── frontend/                # 学生端（React 18 + Taro 4 + NutUI-React）
│   ├── config/index.ts      # Taro 编译配置（含 NutUI WXSS 兼容补丁插件）
│   └── src/
│       ├── pages/           # 主包：login / home
│       ├── packageClass/    # 分包：classroom / quiz / report / me
│       ├── components/      # 公共组件（Tag / CollapseItem / LoadMore / LazyImage）
│       └── utils/api.ts     # Taro.request 封装
├── docs/                    # 电子课本与参考试卷截图、OCR 结果
├── fronted-UI/              # README 截图
└── .gitignore
```

---

## 5. 快速启动

### 5.1 后端（Anaconda + Python 3.13）

```powershell
cd backend
conda activate langchain1.2          # 已装好的 Python 3.13.12 环境
python -m pip install -r requirements.txt
copy .env.example .env              # 填写 api_key
python run.py
```

- 服务地址：`http://127.0.0.1:8001`，接口文档：`http://127.0.0.1:8001/docs`
- MCP 端点：`http://127.0.0.1:8001/mcp`（Streamable HTTP）；`/api/health` 会返回 `mcp` 字段
- 首次启动自动建表并写入演示数据：3 个知识空间、53 个检索片段、44 道题、演示账号
- 演示账号：`teacher / demo123456`（王老师）、`student / demo123456`（小明）、`student2 / demo123456`（小红）
- 重置数据：停止服务后删除 `backend/storage/app.db*`
- 首次开启向量检索后，可访问教师端「知识库」页点「重建索引」批量向量化全部片段

### 5.2 教师端（网页：Vue3 + Element Plus）

```powershell
cd web
npm install
npm run dev        # http://localhost:5173，/api 已代理到 8001
npm run build      # vue-tsc --noEmit + vite build
```

- 顶部标签页：备课工作台 / 授课控制台 / 学情诊断 / 知识库 / **AI 助手（MCP 工具 + RAG）**

### 5.3 学生端（小程序：React + Taro + NutUI）

```powershell
cd frontend
npm install
npm run dev:h5     # 浏览器调试（默认 http://localhost:10086）
npm run dev:weapp  # 微信小程序 watch 模式，产物在 frontend/dist
npm run build:weapp  # 单次构建
npm run build:h5     # H5 构建
```

- **微信小程序**：用微信开发者工具「导入项目」选择 `frontend/dist` 目录（AppID 用测试号），并在「详情 → 本地设置」勾选「不校验合法域名」（本地 `http://127.0.0.1:8001` 请求会被拦）
- `dev:weapp` 是 watch 模式：改代码自动重编译到 `dist`，开发者工具会自动刷新；提交代码前用 `build:weapp` 出正式包
- 学生端默认请求 `http://127.0.0.1:8001/api`，可在登录页修改并持久化
- 接口地址按构建模式读取 `frontend/.env.development` / `.env.production`

---

## 6. 演示流程（约 8 分钟）

1. 浏览器打开教师端，用 `teacher / demo123456` 登录
2. 「备课工作台」→ 生成课件（默认《有理数的加减运算》，10 道题锚点）；查看每页四段式讲稿、题锚点与 RAG 引用片段，可编辑、导出 PPTX / JSON
3. 「授课控制台」→ 选择课件开课，得到 **6 位课堂码**
4. 学生端（微信开发者工具或 H5）登录 `student / demo123456` → 首页输入课堂码入班
5. 教师端点「下一步」（可勾选「同时推送随堂测验」），学生端自动刷新当前页讲稿与题目
6. 学生端「拍题上传」或文字提问：首轮只给提示与追问，再次追问逐步给步骤，最后才给结论；**回答下方显示「依据知识库」引用来源**
7. 教师端「下一步并推题」→ 学生端答题交卷 → 自动跳转批改报告
8. 教师端「学情诊断」查看班级平均、知识点掌握条、错因分布；「授课控制台」点「生成总结」
9. 教师端「AI 助手」：输入「列出我所有的课件」可见 MCP 工具调用标签；「知识库里关于有理数加法有哪些讲解」可见 **RAG 向量召回的引用来源卡片**；说「删掉 xxx 课件」弹出二次确认

### 页面图片

<details>
<summary>Web 端（教师端）截图</summary>

#### 登录页

![1](./fronted-UI/web/1.png)

#### 注册页

![1](./fronted-UI/web/2.png)

#### 备课工作台页

![1](./fronted-UI/web/3.png)

导出 PPT 并查看（讲稿里有真题应用）

![1](./fronted-UI/web/4.png)

![1](./fronted-UI/web/5.png)

#### 授课控制台页

![1](./fronted-UI/web/6.0.png)

![1](./fronted-UI/web/6.png)

学生进入课堂

![1](./fronted-UI/web/6.1.png)

AI 教师、AI 学生、AI 助教互动（多智能体推进）

![1](./fronted-UI/web/6.2.png)

![1](./fronted-UI/web/6.3.png)

课堂总结

![1](./fronted-UI/web/7.png)

![1](./fronted-UI/web/7.1.png)

![1](./fronted-UI/web/7.1.2.png)

课堂结束（仅关闭 / 关闭并开启下一堂）

![1](./fronted-UI/web/7.2.png)

![1](./fronted-UI/web/7.3.png)

#### 学情诊断页

![1](./fronted-UI/web/8.png)

![1](./fronted-UI/web/8.1.png)

#### 知识库页

![1](./fronted-UI/web/9.png)

#### AI 助手页（MCP 增删改查 + RAG 引用来源）

![1](./fronted-UI/web/10.png)

![1](./fronted-UI/web/10.1.0.png)

![1](./fronted-UI/web/RAG.png)

调用 MCP 工具（查）

![1](./fronted-UI/web/10.1.png)

调用 MCP 工具（改）

![1](./fronted-UI/web/10.2.png)

![1](./fronted-UI/web/10.2.1.png)

调用 MCP 工具（删）

![1](./fronted-UI/web/10.3.png)

</details>

<details>
<summary>学生端截图</summary>

#### 登录页 / 注册页

![1](./fronted-UI/uniapp/1.png)

![1](./fronted-UI/uniapp/2.png)

#### 首页

![1](./fronted-UI/uniapp/3.png)

#### 互动课堂页

![1](./fronted-UI/uniapp/4.png)

学生向 AI 助教提问

![1](./fronted-UI/uniapp/4.1.png)

分级提示（先追问与类比，逐步给步骤，最后才给结论）

![1](./fronted-UI/uniapp/4.2.png)

教师发布随堂测验

![1](./fronted-UI/uniapp/5.png)

#### 随堂测验页

![1](./fronted-UI/uniapp/5.1.png)

![1](./fronted-UI/uniapp/5.1.2.png)

#### 答题报告页

![1](./fronted-UI/uniapp/5.2.png)

![1](./fronted-UI/uniapp/5.3.png)

![1](./fronted-UI/uniapp/5.3.2.png)

![1](./fronted-UI/uniapp/5.4.png)

课堂结束

![1](./fronted-UI/uniapp/6.png)

![1](./fronted-UI/uniapp/6.1.png)

#### 我的学情页

![1](./fronted-UI/uniapp/7.png)

![1](./fronted-UI/uniapp/7.1.png)

</details>

---

## 7. 关键设计

### 7.1 多智能体

`backend/app/agents.py`：Courseware / Teacher / Student / Assistant / Grader / Diagnostician。
后端状态机决定「谁在什么时候说什么」，模型只在固定 JSON 契约内生成；模型不可用时全部退回确定性教学脚本，保证离线可演示。

### 7.2 RAG 向量检索

- **入库**：教材/试卷上传后按 `RecursiveCharacterTextSplitter` 分块，向量化（`Qwen3-Embedding-8B`，1024 维）后 16 条一批写入 SQLite `chunk_embeddings` 表（JSON 数组存储）
- **检索**：查询向量化后与全量 chunk 做 **numpy 余弦相似度** 排序取 Top-K，维度不匹配的旧向量自动跳过；召回不足时用关键词 bigram 补齐
- **答疑接入**：
  - 学生提问（`classroom_service.ask`）按「知识点 + 问题」召回 4 条片段传给助教，事件流与响应附带 citations，小程序回答卡片展示「依据知识库：来源（相关度）」
  - 教师提问（`agent.py` `_retrieve_sources`）自动召回 Top-3 注入 system prompt，要求标注 `[编号]` 引用；5 个返回路径全部携带 `sources`，检索失败静默降级不影响对话
- **开关**：`enable_vector=true`（默认开启）时走向量检索，`false` 或 embedding 服务不可用时自动降级关键词检索

### 7.3 防编造（Grounding）

- 备课只允许引用检索到的教材 `chunk_id` 与题库 `exam_item_id`
- `_normalize_llm_draft` 剔除不存在的题目 id；`_balance_difficulties` 强制补齐易/中/难
- 题目保留 `source` 与 `source_type`：`reference_paper`（参考试卷）/ `sample_adapted`（教材改编示例）

### 7.4 引导式答疑

`classroom_service.ask` 按该生在本节课的提问次数递增 `hint_level`（0→3）：
L0 只给追问与类比，L1/L2 逐步给步骤，L3 才给最终结论与完整示范。

### 7.5 判分与学情

- `json_utils.answers_equal`：选择题字母、数值/分数等价、多空同序、多解题「或」顺序无关
- `quiz_service`：步骤级反馈 + 错因归类 + 掌握度 EMA（难题权重更高）
- `question_bank.recommend_similar`：同知识点、优先真题、优先中等难度

### 7.6 实时课堂

- 教师端 SSE：`GET /api/classroom/{id}/stream?token=...`（事件总线 + 1s 心跳）
- 学生端轮询 `GET /api/classroom/{id}/state`（5s），兼容小程序
- 事件类型：`slide_start / teacher_speak / student_questions / assistant_answer / student_question / quiz_push / quiz_submitted / summary`

### 7.7 MCP 工具助手

- **工具层**：`mcp_server.py` 用 `FastMCP` 注册 16 个工具（查询 8 / 写入 5 / 删除 3），挂载 `/mcp`
- **编排**：`agent.py` 拉取工具 schema → 模型 function calling → 最多 6 轮「选工具 → 执行 → 结果回填 → 总结」；兼容 Qwen3-VL 的 `<tool_call>` 文本协议
- **权限与安全**：仅教师可用；删除走 `confirm_token` + 5 分钟 TTL 二次确认；被引用的题目/文档/课件禁止删除；调用写入 `mcp_audit_logs`
- **历史对话**：`assistant_conversations` + `assistant_messages` 按教师账号隔离；离线（无 api_key）时降级为关键词直调查询工具

### 7.8 学生端组件与性能（React + Taro）

- **分包加载**：登录/首页在主包，课堂/测验/报告/学情在 `packageClass` 分包，主包体积更小
- **图片懒加载**：`LazyImage` 组件（`components/ui.tsx`）基于 IntersectionObserver / 小程序 `IntersectionObserver` 实现，课堂讲稿配图进入可视区域才加载
- **公共组件封装**：Tag / CollapseItem / LoadMore / LazyImage 四个通用组件，页面零重复样式
- **NutUI WXSS 兼容**：`config/index.ts` 的 Vite 插件在 weapp 构建期改写 NutUI 样式（calc 乘法改除法、`:root`→`page`、删除通配符选择器规则），H5 构建不受影响

---

## 8. 数据来源与标注

- `docs/2026北师大版七年级上册数学期中测试卷(含答案).txt` 为图片型文本，已用 Qwen3-VL OCR 到 `docs/exam_pages/ocr/`
- 教材库使用课标对齐的片段，支持后台上传替换为其他教材
- 参考试卷题标注 `source_type=reference_paper`；另有教材改编示例题 `sample_adapted`

---

## 9. 配置说明（`backend/.env`）

| 键 | 说明 |
| --- | --- |
| `api_key` | 硅基流动密钥（`sk-` 开头），缺失则自动离线演示 |
| `model_name` / `embedding_model` | 默认 `Qwen/Qwen3-VL-32B-Instruct` / `Qwen/Qwen3-Embedding-8B` |
| `request_timeout` | 单次调用超时，整份课件 JSON 建议 240~300 秒 |
| `use_llm` | `false` 时全部走确定性脚本（答辩断网也可用） |
| `enable_vector` | 向量检索开关，默认 `true`（SQLite 向量库，无原生二进制依赖）；关闭时检索自动降级为关键词 bigram |
| `host` / `port` | 默认 `0.0.0.0:8001` |

> 本项目检索层不依赖 Chroma。`requirements.txt` 中的 chromadb 相关包可按需移除，不影响启动与检索功能。

---

## 10. 测试与自检脚本

```powershell
cd backend
conda activate langchain1.2
python -m pytest tests -q                     # 23 项：鉴权/备课/检索/课堂/测验/学情/判分/MCP
python scripts\smoke_e2e.py                   # 离线端到端冒烟（输出 SMOKE OK）
python scripts\smoke_mcp.py                   # MCP 冒烟：工具列举 → 建库 → 导题 → 查询 → 删除
python scripts\check_llm.py                   # 真实模型 + 嵌入连通性
```

前端自检：

```powershell
cd web && npm run build                       # vue-tsc + vite build
cd frontend && npm run build:h5 && npm run build:weapp
```

---

## 11. 已知限制

- 小程序端需自行填写 appid（测试号即可）
- 板书/公式以文本形式呈现（LaTeX 渲染暂未接入）
- AI 助手历史对话重新加载时不回显 RAG 引用卡片（sources 仅跟随实时回答，不落库）
