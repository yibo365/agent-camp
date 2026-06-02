---
title: LlamaIndex 深度剖析
description: 从 GPT Index 到 Agent 框架——LlamaIndex 的三层抽象（Loader / Node / Index）、Query Engine vs Chat Engine、Workflows 编排引擎、和 LangChain 的真实差异。
pageClass: frameworks-llamaindex-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">主流 Agent 框架</p>
  <h1>LlamaIndex 深度剖析</h1>
  <p class="doc-hero__lead">LlamaIndex 的前身叫 GPT Index——一个让 LLM 能"读"自己数据的索引库。2024 年它升级为完整的 Agent 框架，推出 Workflows 编排引擎，从"RAG 工具箱"变成"数据驱动的 Agent 平台"。RAG 场景里它仍然是事实上的标准。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：入门 / 进阶</span>
    <span>核心链路：Loader → Node → Index → Query Engine</span>
    <span>面试重点：索引类型 + Workflows + 和 LangChain 边界</span>
  </div>
</section>

> **本文边界**：聚焦 LlamaIndex 的核心抽象和 Workflows 引擎。RAG 的通用原理见 [RAG 基础](../rag/basics)；混合检索见 [混合检索](../rag/hybrid-search)；与 LangChain 的全面对比见 [选型决策树](./comparison)。

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>LlamaIndex 的 Document、Node、Index 三个概念分别是什么？为什么这样分层？</strong>
    <span>考对数据流的理解——Document 是源数据，Node 是切分后的块，Index 是组织 Node 的结构。</span>
  </div>
  <div>
    <strong>VectorStoreIndex 之外，LlamaIndex 还有什么索引类型？什么场景用 SummaryIndex？</strong>
    <span>考索引选型——SummaryIndex 全量遍历、TreeIndex 层次摘要、KeywordTableIndex 关键词倒排，不是所有场景都用 vector。</span>
  </div>
  <div>
    <strong>Query Engine 和 Chat Engine 有什么区别？什么时候用哪个？</strong>
    <span>考组件边界——Query Engine 是单次问答（无状态），Chat Engine 维护对话历史（有状态）。</span>
  </div>
  <div>
    <strong>LlamaIndex 的 Workflows 和 LangGraph 是什么关系？</strong>
    <span>考框架演进——都是 Agent 编排引擎，但 Workflows 用事件驱动模型，LangGraph 用图状态机模型。</span>
  </div>
  <div>
    <strong>LlamaIndex 在 RAG 上做得比 LangChain 好的具体地方是什么？</strong>
    <span>考工程细节——更多内置的高级 RAG 模式（HyDE、Recursive、SubQuestion、Multi-Document）、更细的切分策略、对结构化数据更友好。</span>
  </div>
  <div>
    <strong>用 LlamaIndex 做 RAG 时，Embedding 模型怎么选？维度越高越好吗？</strong>
    <span>考向量基础——维度影响存储成本和检索速度，需要在精度和成本间权衡。</span>
  </div>
  <div>
    <strong>LlamaParse 和普通 PDF 解析有什么不同？为什么 LlamaIndex 团队要单独做这个？</strong>
    <span>考对真实数据的认知——金融报表、医疗病历这类带表格、公式、嵌套结构的文档，普通解析器会丢失结构信息。</span>
  </div>
</div>

---

## 为什么需要 LlamaIndex

2023 年早期，做 RAG 是这样一个流程：

```python
# 你想让 LLM 回答关于你公司文档的问题，要写：

# 1. 读 PDF（PyPDF2 还是 pdfplumber？表格怎么处理？）
import PyPDF2
text = extract_text_from_pdf("manual.pdf")

# 2. 切分（按字符？按句子？滑动窗口多大？）
chunks = [text[i:i+1000] for i in range(0, len(text), 800)]

# 3. embedding（OpenAI? Cohere? 本地模型?）
import openai
embeddings = [openai.embeddings.create(input=c, model="...") for c in chunks]

# 4. 存到向量库（自己管理 metadata、ID、过滤……）
import chromadb
collection = chromadb.Client().create_collection("docs")
collection.add(documents=chunks, embeddings=embeddings, ids=[...])

# 5. 检索（top-k? rerank? hybrid?）
results = collection.query(query_embedding, n_results=5)

# 6. 拼 prompt 让 LLM 回答
prompt = f"Context: {results['documents']}\n\nQuestion: {query}"
answer = openai.chat.completions.create(messages=[{"role": "user", "content": prompt}])
```

500 行胶水代码，换个 vector store 重写一遍，换个 embedding 模型再调一遍。LlamaIndex（当时还叫 GPT Index）的初衷就是把这套流程标准化成 5 行：

```python
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader

documents = SimpleDirectoryReader("./data").load_data()
index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine()
response = query_engine.query("公司的退货政策是什么？")
```

但这只是表面——LlamaIndex 真正的价值在于把 RAG 的每个环节都暴露了可定制的扩展点：你可以换 reader、换 splitter、换 embedding、换 vector store、换 reranker、换 prompt——但默认配置就能工作。

---

## 核心抽象：Document / Node / Index

LlamaIndex 的数据流分三层：

```
原始文件                Document                     Node                  Index
  (PDF/HTML/...)    →    (LlamaIndex 内部表示)    →    (切分块 + metadata)  → (组织结构)
                          含 text + metadata           含 embedding
```

### Document：源数据的统一表示

`Document` 是 LlamaIndex 内部的数据载体，对外屏蔽了文件格式差异：

```python
from llama_index.core import Document

doc = Document(
    text="原文内容...",
    metadata={
        "source": "manual.pdf",
        "page": 5,
        "section": "Returns Policy",
        "last_modified": "2025-03-01"
    }
)
```

`metadata` 在 RAG 里至关重要——它不只是"附加信息"，还会被传给 LLM（控制 `excluded_llm_metadata_keys`）、用来过滤检索（`filters={"section": "Returns"}`）、用来跟踪溯源。

### Node：切分后的最小单元

Document 经过 `NodeParser` 切分成 Node。LlamaIndex 提供多种 NodeParser：

| Parser | 切分方式 | 适用场景 |
|---|---|---|
| `SentenceSplitter` | 按句子边界 + token 限制 | 通用文本 |
| `SentenceWindowNodeParser` | 滑动窗口（句子 + 前后 N 句上下文） | 短匹配 + 大上下文召回 |
| `HierarchicalNodeParser` | 多层级（大段 → 小段 → 句子） | 自动摘要式检索 |
| `SemanticSplitterNodeParser` | 按语义相似度切分（embedding 距离） | 结构混乱的长文档 |
| `MarkdownNodeParser` | 按 markdown 标题层级 | 文档站、wiki |
| `CodeSplitter` | 按 AST（函数/类边界） | 代码库 |

切分策略对 RAG 效果影响巨大——切碎了上下文丢失，切粗了 retrieval 不准。LlamaIndex 的优势是这些策略都内置且可组合。

### Index：组织 Node 的结构

`VectorStoreIndex` 是最常见的，但绝不是唯一选择：

| Index 类型 | 检索方式 | 适用场景 |
|---|---|---|
| `VectorStoreIndex` | embedding 相似度 | 标准 RAG |
| `SummaryIndex`（曾叫 ListIndex） | 全量遍历，LLM 评估每个 Node | 需要看全部内容才能回答 |
| `TreeIndex` | 自底向上摘要 + 自顶向下查询 | 大规模文档的层次摘要 |
| `KeywordTableIndex` | 关键词倒排索引 | 关键词精确匹配场景 |
| `KnowledgeGraphIndex` | 抽取实体关系存图 | 需要推理关系（GraphRAG） |
| `DocumentSummaryIndex` | 每个文档先生成摘要再检索 | 文档级粒度的检索 |

举个例子说明为什么不能只用 VectorStoreIndex：

```
场景：用户问"总结一下这份 100 页报告的核心结论"。

VectorStoreIndex 的问题：
  - top-k 检索只会返回最相似的 5 段
  - 但用户要的是"整体总结"，需要全文遍历
  - 用 VectorStoreIndex 会漏掉大量内容

SummaryIndex 的做法：
  - 遍历所有 Node，让 LLM 逐段评估并合并
  - 慢但全
  - 适合"总结型"问题，不适合"查找型"问题
```

成熟的 LlamaIndex 应用通常用 `RouterQueryEngine` 把多种 Index 组合起来：

```python
from llama_index.core.query_engine import RouterQueryEngine
from llama_index.core.tools import QueryEngineTool

vector_tool = QueryEngineTool.from_defaults(
    query_engine=vector_index.as_query_engine(),
    description="用于回答具体问题的事实性查询"
)

summary_tool = QueryEngineTool.from_defaults(
    query_engine=summary_index.as_query_engine(),
    description="用于总结和概括类问题"
)

router = RouterQueryEngine(
    selector=LLMSingleSelector.from_defaults(),
    query_engine_tools=[vector_tool, summary_tool]
)

# LLM 自己决定用哪个 engine
router.query("公司的退货政策？")        # 走 vector
router.query("总结一下这份手册")        # 走 summary
```

---

## Query Engine vs Chat Engine：状态的边界

这是 LlamaIndex 里非常容易混淆的两个组件：

```python
# Query Engine：无状态
query_engine = index.as_query_engine()
query_engine.query("公司在哪里？")
query_engine.query("有多少员工？")     # 第二次调用不知道第一次问了什么

# Chat Engine：有状态
chat_engine = index.as_chat_engine()
chat_engine.chat("公司在哪里？")
chat_engine.chat("有多少员工？")        # 知道在聊"公司"，能正确理解上下文
```

Chat Engine 内部维护一个 `ChatMemoryBuffer`，每轮把历史消息塞进 prompt。它还做了 RAG 场景特有的处理——**对话历史压缩**：

```
原始历史（5 轮对话）→ 直接塞 prompt？
  问题：token 数膨胀，旧消息也会出现在 retrieval 里干扰

LlamaIndex 的做法：
  1. 用 LLM 把历史 + 当前问题改写成一个"独立的问题"
  2. 用改写后的问题去检索（去除对话噪声）
  3. 把检索结果 + 历史 + 当前问题一起给 LLM 生成回复

例：
  历史："公司在哪里？" → "杭州"
  当前问题："有多少员工？"
  改写后："杭州的这家公司有多少员工？"
  → 检索时不会被无关历史干扰
```

这种"contextualize question"模式是 RAG 对话场景的关键技巧。LlamaIndex 把它做成了 `CondenseQuestionChatEngine`，开箱即用。

---

## Workflows：LlamaIndex 的 Agent 编排引擎

2024 下半年 LlamaIndex 推出 **Workflows**，对标 LangGraph。但设计理念完全不同——Workflows 用**事件驱动**模型，不用图状态机：

```python
from llama_index.core.workflow import (
    Workflow, Event, StartEvent, StopEvent, step
)

# 定义事件类型
class RetrieveEvent(Event):
    query: str

class GenerateEvent(Event):
    docs: list

# 用 @step 注册事件处理器
class RAGWorkflow(Workflow):
    @step
    async def retrieve(self, ev: StartEvent) -> RetrieveEvent:
        return RetrieveEvent(query=ev.query)
    
    @step
    async def search(self, ev: RetrieveEvent) -> GenerateEvent:
        docs = await retriever.aretrieve(ev.query)
        return GenerateEvent(docs=docs)
    
    @step
    async def generate(self, ev: GenerateEvent) -> StopEvent:
        answer = await llm.acomplete(...)
        return StopEvent(result=answer)

workflow = RAGWorkflow()
result = await workflow.run(query="...")
```

**事件驱动 vs 图状态机的对比：**

| 维度 | LlamaIndex Workflows | LangGraph |
|---|---|---|
| 范式 | 事件驱动（pub/sub） | 显式图结构 |
| 节点连接 | 隐式（通过事件类型推断） | 显式（add_edge） |
| 并发模型 | 异步事件（asyncio） | 超级步骤（superstep） |
| 状态管理 | 隐藏在 Context 对象 | 显式 State + Reducer |
| 可视化 | 内置 `draw_all_possible_flows()` | 内置图渲染 |
| 调试 | 事件流追踪 | State 时间旅行 |

Workflows 的优势是 Python 程序员的代码风格——你写函数 + 类型注解，框架自动连接。LangGraph 更"工程化"——状态和图都是显式声明，更适合复杂场景但学习曲线陡。

举个对比，同样实现"重试逻辑"：

```python
# LangGraph：显式定义 retry 节点 + 路由边
def should_retry(state):
    if state["attempts"] < 3 and state["error"]:
        return "retry"
    return END
graph.add_conditional_edges("call_api", should_retry, {"retry": "call_api", END: END})

# Workflows：处理器函数自己决定发什么事件
@step
async def call_api(self, ev: ApiRequestEvent) -> ApiResponseEvent | RetryEvent:
    try:
        result = await api.call(ev.query)
        return ApiResponseEvent(result=result)
    except Exception as e:
        if ev.attempts < 3:
            return RetryEvent(query=ev.query, attempts=ev.attempts + 1)
        raise
```

Workflows 的写法更"自然"，但代价是流程不那么可见——你要看完所有 @step 方法才能知道整个图长什么样。

---

## LlamaParse：被严重低估的差异化

LlamaIndex 团队 2024 年推出 LlamaParse，是一个专门处理复杂文档的解析服务。表面看是 PyPDF2 的竞品，实际是个完全不同维度的工具。

普通 PDF 解析的问题：

```
原始 PDF（财报）：
┌─────────────────────────────┐
│ Revenue by Region (Q3 2024) │
├──────────┬──────────────────┤
│ Region   │ Revenue ($M)     │
├──────────┼──────────────────┤
│ North    │ 1,234            │
│ Europe   │ 987              │
│ Asia     │ 2,341            │
└──────────┴──────────────────┘

PyPDF2 提取的文本：
"Revenue by Region (Q3 2024) Region Revenue ($M) North 1,234 Europe 987 Asia 2,341"

→ 表格结构丢失，LLM 无法理解这是表格
```

LlamaParse 用 LLM 视觉模型解析，输出结构化 Markdown：

```markdown
## Revenue by Region (Q3 2024)

| Region | Revenue ($M) |
|--------|--------------|
| North  | 1,234        |
| Europe | 987          |
| Asia   | 2,341        |
```

这对金融、法律、医疗场景的 RAG 效果提升明显——这些行业的文档大量包含表格、公式、嵌套结构。LlamaParse 的存在让 LlamaIndex 在"非纯文本数据"的 RAG 上有显著优势。

---

## 容易踩的坑

**坑 1：默认切分参数不适合中文**

- **现象**：用 `SentenceSplitter` 切中文文档，Node 边界经常切在词中间
- **根因**：默认配置基于英文句号分句，中文标点（。！？）不完整识别
- **修法**：用 `paragraph_separator="\n\n"` + `secondary_chunking_regex=r"[^，。！？]+[，。！？]?"` 自定义中文分句规则

**坑 2：metadata 字段过多导致 prompt 膨胀**

- **现象**：检索结果里每个 Node 带的 metadata 把 prompt 撑到上限
- **根因**：默认所有 metadata 都会拼到 LLM 的 context 里
- **修法**：用 `excluded_llm_metadata_keys` 排除不需要 LLM 看到的字段（比如内部 ID、时间戳）。但保留它们在 `excluded_embed_metadata_keys` 之外，让 embedding 能用上

**坑 3：VectorStoreIndex 加载大文档时内存爆炸**

- **现象**：加载 10GB 文档库，进程 OOM
- **根因**：默认在内存里构建 Index，所有 Node 和 embedding 都驻留
- **修法**：用外部 vector store（Pinecone/Chroma/Qdrant）+ `StorageContext`，让 Index 直接写远程，不在本地 hold

**坑 4：Workflows 的事件类型重名导致路由错乱**

- **现象**：两个 @step 都返回 `Event`（基类），运行时报"ambiguous event routing"
- **根因**：Workflows 用事件类型做路由，必须是具体子类
- **修法**：每个 step 返回具体的事件子类，不要返回基类 `Event`

---

## LlamaIndex vs LangChain：什么时候选哪个

经常被问到的对比，给一个清晰的判断：

| 维度 | LlamaIndex | LangChain / LangGraph |
|---|---|---|
| RAG 深度 | 强（索引类型多、Parser 多） | 中（基础 RAG 够用，高级模式要自己组装） |
| Agent 编排 | 中（Workflows 较新） | 强（LangGraph 成熟，多 Agent 模式丰富） |
| 工具调用 | 中（够用） | 强（生态最全） |
| 文档处理 | 强（LlamaParse、HierarchicalNodeParser） | 中 |
| 数据连接器 | 多（LlamaHub 600+） | 多（社区生态大） |
| 学习曲线 | 较低（API 设计更 Pythonic） | 较高（LCEL + Graph） |
| 可观测性 | LlamaTrace（较新） | LangSmith（成熟） |
| 何时选 | RAG 为核心、文档处理是难点 | 复杂 Agent 编排、多 Agent 协作、需要 HITL |

**实际项目里可以混用**——LlamaIndex 做数据层（Loader + Index + Retriever），LangGraph 做编排层。两者的接口都标准化得不错。

---

## 面试题深度解析

**Q1: Document/Node/Index 为什么这样分层？**

- **30 秒版本**：Document 是源数据的统一表示，屏蔽文件格式差异；Node 是切分后的检索粒度，附加 embedding 和 metadata；Index 是组织 Node 的数据结构（vector 索引、关键词倒排、树结构等）。分层让"读取""切分""组织""检索"四个环节解耦，每层都能独立替换。
- **追问：Node 和 chunk 是一回事吗？** 大致是。chunk 是 RAG 领域的通用术语，指切分后的文本块。Node 是 LlamaIndex 的具体实现，除了 text 还附加了 metadata、relationships（前后节点、父节点）、embedding。Node 比 chunk 多了"结构感知"。
- **追问：Node 之间的 relationship 有什么用？** 用于高级检索模式。比如 SentenceWindowNodeParser 切分时，每个 Node 都记录"前 3 句""后 3 句"作为兄弟节点。检索匹配到一个 Node 后，可以自动展开兄弟节点拼成更大的上下文。这就是 "small-to-big retrieval" 的实现。

**Q2: Workflows 和 LangGraph 的事件驱动 vs 图状态机，哪个更好？**

- **30 秒版本**：没有绝对更好，是不同 trade-off。Workflows 的事件驱动更接近普通 Python 编程，开发体验流畅，但流程不显式（要读所有 @step 才知道整体结构）。LangGraph 的图模型显式声明所有节点和边，结构清晰但前期声明代码多。简单线性流程选 Workflows，复杂分支/并发选 LangGraph。
- **追问：哪个性能更好？** 量级差不多。两者底层都是 asyncio，节点执行的开销主要在 LLM 调用本身，框架开销可忽略。差异在并发模型——Workflows 的事件可以乱序触发（更灵活），LangGraph 的 superstep 保证每轮所有节点完成才进下一轮（更确定）。
- **追问：状态管理怎么对比？** Workflows 把状态藏在 Context 对象里，要手动 `await ctx.set("key", value)`。LangGraph 的 State 是显式 TypedDict，节点函数返回 State 变更。前者更隐式（适合简单场景），后者更显式（适合复杂状态合并）。

**Q3: 为什么 LlamaIndex 在 RAG 上做得比 LangChain 好？**

- **30 秒版本**：因为它从 day 1 就是为 RAG 设计的——抽象（Document/Node/Index）天然契合 RAG 数据流，内置的高级模式多（HierarchicalNodeParser、SentenceWindow、RecursiveRetriever、SubQuestionQueryEngine），LlamaParse 解决了真实文档的结构化解析。LangChain 是通用框架，RAG 只是它的一个用例。
- **追问：具体哪些高级模式 LangChain 难以做到？** Hierarchical/Recursive retrieval（先粗粒度检索文档级，再细粒度检索 chunk 级）、SubQuestionQueryEngine（把复杂问题拆成子问题分别检索）、SemanticSplitterNodeParser（按 embedding 距离切分）。LangChain 里这些都要自己拼。
- **追问：那 LlamaIndex 为什么不取代 LangChain？** 因为 LangGraph 在 Agent 编排上的能力是 LlamaIndex 短期追不上的——多 Agent、HITL、checkpoint、时间旅行。LlamaIndex 的 Workflows 是补课，但生态成熟度和心智份额都还差距明显。所以现状是 LlamaIndex 做 RAG 数据层 + LangGraph 做 Agent 编排，是很多生产项目的组合。

---

## 延伸阅读

- **官方文档** [docs.llamaindex.ai](https://docs.llamaindex.ai) — 重点看 Loading、Indexing、Querying、Workflows 四章。文档质量比 LangChain 高
- **LlamaHub** [llamahub.ai](https://llamahub.ai) — 600+ 数据连接器、agent、tool 的注册中心。找数据源（Notion、Slack、Google Drive）的连接器从这里入手
- **LlamaParse** [cloud.llamaindex.ai](https://cloud.llamaindex.ai) — 付费服务但有免费额度。如果你的 RAG 数据里有大量表格/图表，值得试
- **源码** [github.com/run-llama/llama_index](https://github.com/run-llama/llama_index) — `llama-index-core/llama_index/core/` 是核心抽象。Workflows 在 `llama-index-core/llama_index/core/workflow/`
- **Building Performant RAG Applications for Production** — LlamaIndex 官方博客系列，从入门 RAG 到生产级 RAG 的全流程经验，必读
