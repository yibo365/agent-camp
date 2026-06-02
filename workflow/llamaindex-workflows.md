---
title: LlamaIndex Workflows
description: LlamaIndex 的事件驱动编排——用 Step + Event 替代 DAG，天然支持循环和自修正。核心概念、与 LangGraph 的对比、实战示例与选型建议。
pageClass: workflow-llamaindex-workflows-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">流程编排</p>
  <h1>LlamaIndex Workflows</h1>
  <p class="doc-hero__lead">LlamaIndex 团队发现 DAG（有向无环图）在 Agent 场景下撞墙——无法表达循环和自修正。于是他们换了个思路：不画图，用事件驱动。每个步骤监听特定事件、处理后发射新事件——控制流由事件的流转隐式定义，而不是由显式的边连接。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：了解编排范式多样性</span>
    <span>核心：Step + Event + Context</span>
    <span>面试重点：事件驱动 vs 图编排的权衡</span>
  </div>
</section>

> **本文边界**：聚焦 LlamaIndex Workflows 的设计理念和使用方法。图编排范式见 [LangGraph 深度解析](./langgraph)；编排模式的通用理论见 [编排模式](./patterns)；LlamaIndex 框架全貌见 [LlamaIndex 框架](../frameworks/llamaindex)。

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>LlamaIndex Workflows 的核心概念是什么？和 LangGraph 有什么本质区别？</strong>
    <span>考能不能讲清"事件驱动 vs 图编排"的范式差异。</span>
  </div>
  <div>
    <strong>LlamaIndex 为什么从 Query Pipeline（DAG）转向事件驱动的 Workflows？</strong>
    <span>考对 DAG 局限性的理解——DAG 不能表达循环，Agent 场景需要循环。</span>
  </div>
  <div>
    <strong>事件驱动架构在 LLM 编排里的优势和劣势分别是什么？</strong>
    <span>考对范式 trade-off 的理解——灵活但控制流不可视。</span>
  </div>
  <div>
    <strong>什么场景选 LlamaIndex Workflows，什么场景选 LangGraph？</strong>
    <span>考选型判断——不是"哪个好"，而是各自的 sweet spot。</span>
  </div>
  <div>
    <strong>Workflows 的 Context 和 LangGraph 的 State 有什么区别？</strong>
    <span>考对状态管理机制差异的理解。</span>
  </div>
</div>

---

## 为什么 LlamaIndex 放弃了 DAG

LlamaIndex 早期的编排方案叫 **Query Pipeline**——标准的 DAG，节点是组件、边是数据流向。在 RAG 场景下工作得很好：retriever → reranker → synthesizer，线性管线。

但当他们尝试加 Agent 能力时，DAG 崩了：

```text
问题 1：循环——Agent 生成的代码有 bug，需要重试。DAG 不允许环。
问题 2：条件分支——不同输入走不同路径，DAG 的边定义变得很复杂。
问题 3：调试困难——graph 节点一多，出了问题不知道执行到了哪个节点。
问题 4：可读性——20 个节点 + 30 条边的 DAG 代码，没人看得懂。
```

核心矛盾：**DAG = 有向无环图，但 Agent 的自修正天然需要环。**

LangGraph 的解决方案是在有向图里允许环（有向有环图）。LlamaIndex 走了另一条路：**完全放弃图，用事件驱动。**

---

## 核心概念

### Step：带 `@step` 装饰器的异步函数

每个 Step 声明它监听什么事件、返回什么事件：

```python
from llama_index.core.workflow import Workflow, StartEvent, StopEvent, step

class MyWorkflow(Workflow):
    @step
    async def process(self, ev: StartEvent) -> StopEvent:
        query = ev.get("query")
        result = await self.llm.acomplete(query)
        return StopEvent(result=str(result))
```

Step 的类型签名就是控制流定义：
- 参数类型 `ev: StartEvent` = "我监听 StartEvent"
- 返回类型 `-> StopEvent` = "我发射 StopEvent"

### Event：步骤间的消息

Event 是 Pydantic model，携带数据在步骤间传递：

```python
from llama_index.core.workflow import Event

class RetrievalDoneEvent(Event):
    docs: list[str]

class GenerationDoneEvent(Event):
    draft: str
    quality_score: float
```

三个特殊 Event：
- **StartEvent**：Workflow 启动时自动发射，携带 `run()` 的参数
- **StopEvent**：任何 Step 返回 StopEvent 时 Workflow 停止，其 result 字段作为最终结果
- **自定义 Event**：你定义的任何 Event，用于步骤间通信

### Context：跨步骤的共享状态

```python
from llama_index.core.workflow import Context

class MyWorkflow(Workflow):
    @step
    async def step_a(self, ctx: Context, ev: StartEvent) -> MyEvent:
        await ctx.set("user_id", ev.get("user_id"))
        return MyEvent(data="...")

    @step
    async def step_b(self, ctx: Context, ev: MyEvent) -> StopEvent:
        user_id = await ctx.get("user_id")  # 从 context 读取
        return StopEvent(result=f"Done for {user_id}")
```

Context 是全局可变状态，所有 Step 共享。和 LangGraph 的 State 的区别：LangGraph 的 State 是声明式的（TypedDict + Reducer），Workflows 的 Context 是命令式的（get/set）。

### 事件如何定义控制流

关键理念：**你不画边，事件的发射和监听隐式地定义了控制流。**

```python
class RetrievalEvent(Event):
    docs: list[str]

class EvalEvent(Event):
    passed: bool
    feedback: str

class MyWorkflow(Workflow):
    @step
    async def retrieve(self, ev: StartEvent) -> RetrievalEvent:
        docs = await self.retriever.aretrieve(ev.get("query"))
        return RetrievalEvent(docs=[d.text for d in docs])

    @step
    async def generate(self, ev: RetrievalEvent) -> EvalEvent:
        draft = await self.llm.acomplete(f"基于以下资料回答：{ev.docs}")
        score = await self.evaluator.evaluate(draft)
        return EvalEvent(passed=score > 0.8, feedback=str(draft))

    @step
    async def decide(self, ev: EvalEvent) -> RetrievalEvent | StopEvent:
        if ev.passed:
            return StopEvent(result=ev.feedback)
        # 不合格→发射 RetrievalEvent→回到 retrieve 步骤
        return RetrievalEvent(docs=[])  # 触发重新检索
```

`decide` 返回 `RetrievalEvent` → 触发 `retrieve` 步骤 → 形成循环。不需要显式画"边"，事件类型自然引导了流程。

---

## 实战：自修正 RAG Workflow

一个完整的 RAG + 质量评估 + 自修正循环：

```python
from llama_index.core.workflow import Workflow, StartEvent, StopEvent, Event, step, Context
from llama_index.llms.openai import OpenAI

class DocsRetrieved(Event):
    query: str
    docs: list[str]

class DraftGenerated(Event):
    draft: str
    attempts: int

class EvalResult(Event):
    passed: bool
    draft: str
    attempts: int

class SelfCorrectingRAG(Workflow):
    MAX_ATTEMPTS = 3

    def __init__(self, retriever, **kwargs):
        super().__init__(**kwargs)
        self.retriever = retriever
        self.llm = OpenAI(model="gpt-4o")

    @step
    async def retrieve(self, ev: StartEvent) -> DocsRetrieved:
        query = ev.get("query")
        nodes = await self.retriever.aretrieve(query)
        return DocsRetrieved(query=query, docs=[n.text for n in nodes])

    @step
    async def generate(self, ev: DocsRetrieved) -> DraftGenerated:
        context = "\n".join(ev.docs)
        response = await self.llm.acomplete(
            f"基于以下资料回答问题。\n资料：{context}\n问题：{ev.query}"
        )
        # 从 context 读取当前尝试次数
        attempts = getattr(ev, '_attempts', 0) + 1
        return DraftGenerated(draft=str(response), attempts=attempts)

    @step
    async def evaluate(self, ev: DraftGenerated) -> EvalResult:
        eval_response = await self.llm.acomplete(
            f"评估以下回答的准确性，返回 0-1 分数：\n{ev.draft}"
        )
        score = float(str(eval_response).strip())
        return EvalResult(
            passed=score > 0.7,
            draft=ev.draft,
            attempts=ev.attempts,
        )

    @step
    async def decide(self, ev: EvalResult) -> DocsRetrieved | StopEvent:
        if ev.passed:
            return StopEvent(result=ev.draft)
        if ev.attempts >= self.MAX_ATTEMPTS:
            return StopEvent(result=ev.draft)  # 到上限，返回最后一版
        # 重新检索（可以调整 query）
        return DocsRetrieved(query="", docs=[])

# 使用
workflow = SelfCorrectingRAG(retriever=my_retriever, timeout=30)
result = await workflow.run(query="什么是 RAG？")
```

控制流由事件隐式定义：
- `StartEvent` → `retrieve` → `DocsRetrieved` → `generate` → `DraftGenerated` → `evaluate` → `EvalResult` → `decide`
- `decide` 返回 `DocsRetrieved` → 回到 `generate`（循环）
- `decide` 返回 `StopEvent` → 结束

---

## LlamaIndex Workflows vs LangGraph

| 维度 | LlamaIndex Workflows | LangGraph |
|------|---------------------|-----------|
| 编排范式 | 事件驱动 | 图（有向有环） |
| 控制流定义 | 隐式（事件类型） | 显式（边和条件边） |
| 可视化 | 较难——控制流分散在各 step 的类型签名里 | 天然——graph 结构直接可视化 |
| 循环支持 | 天然——step 发射之前的 event 就形成循环 | 支持——条件边回指之前的节点 |
| 状态管理 | Context（命令式 get/set） | State（声明式 TypedDict + Reducer） |
| Checkpoint | 需额外实现 | 内置 checkpointer |
| HITL | 需手动实现 | 内置 interrupt + resume |
| Streaming | 内置支持 | 内置支持 |
| 学习曲线 | 中——理解事件驱动模型 | 陡——理解图论 + 状态管理 |
| 最佳场景 | LlamaIndex 生态内的 RAG + Agent | 需要精确控制流 + 生产级持久化 |

### 核心取舍

**LlamaIndex Workflows 的优势**：
- 循环更自然——不需要显式画回边，发射事件就是循环
- 代码更像正常 Python——class + async method，没有图论概念
- 和 LlamaIndex 生态无缝集成——retriever、node parser、synthesizer 直接用

**LlamaIndex Workflows 的劣势**：
- 控制流不可视——事件流转要看每个 step 的类型签名才能推理出来
- Checkpoint 和 HITL 不是内置的——LangGraph 的 checkpointer + interrupt 更成熟
- 生态小——LangGraph 的企业案例、社区资源、第三方工具多得多

### 选型建议

- **已经在用 LlamaIndex 做 RAG**，想加 Agent 能力 → Workflows 是自然选择，不用换生态
- **从零开始做 Agent**，需要 checkpoint、HITL、可视化 → LangGraph
- **简单的自修正循环**（检索 → 生成 → 评估 → 重试）→ Workflows 代码更简洁
- **复杂的多 Agent + 条件路由**→ LangGraph 的显式图结构更清晰

---

## 容易踩的坑

### 坑 1：事件类型冲突导致意外触发

**现象**：某个 Step 莫名其妙被触发了，你没预期到这条路径。

**根因**：两个不同的 Step 发射了同一类型的 Event，另一个监听该 Event 的 Step 被意外触发。

**修法**：每个语义不同的步骤间传递用不同的 Event 类型。宁可多定义几个 Event class，也不要复用。

### 坑 2：循环没有退出条件

**现象**：Workflow 跑了 30 秒后超时，因为 evaluate → generate 一直在循环。

**根因**：评估标准太严 + 没设 max_attempts。

**修法**：(1) Workflow 构造时设 `timeout=30`（秒）；(2) 在 decide step 里检查 attempts 上限；(3) 评估标准用 "good enough" 而不是 "perfect"。

### 坑 3：Context 并发读写

**现象**：多个并行 Step 同时写 Context 的同一个 key，结果不确定。

**根因**：Context 的 get/set 是命令式的，没有 LangGraph Reducer 那样的合并策略。

**修法**：并行 Step 写不同的 key，或者在 fan-in step 里手动合并。

### 坑 4：调试困难——不知道事件流到了哪

**现象**：Workflow 卡住了，不知道哪个 Step 没有发射预期的 Event。

**根因**：事件驱动的控制流是隐式的——你看不到"执行到了哪一步"。

**修法**：(1) 在每个 Step 开头加日志：`print(f"Step {self.__class__.__name__} received {type(ev).__name__}")`；(2) 用 LlamaIndex 的 observability 集成（支持 Arize Phoenix 等工具）。

---

## 面试题深度解析

### Q: LlamaIndex Workflows 和 LangGraph 有什么本质区别？

**30 秒版本**：范式不同。LangGraph 是**图编排**——你显式定义节点和边（包括条件边、回边），控制流在图结构里一目了然。LlamaIndex Workflows 是**事件驱动**——每个 Step 声明它监听什么 Event、发射什么 Event，控制流由事件的流转隐式定义。图编排的优势是可视化和可推理，事件驱动的优势是循环更自然、代码更像正常 Python。

**追问**：那你觉得哪种更好？
没有绝对更好。如果你需要一眼看清"Agent 会走哪些路径"→ LangGraph 的图结构更直观。如果你的 Agent 主要是"生成 → 评估 → 修正"的循环，不需要复杂路由 → Workflows 代码更干净。生产级别上 LangGraph 的 checkpoint + HITL 更成熟，这是选它的实用理由。

### Q: 事件驱动在 LLM 编排里的优势和劣势？

**30 秒版本**：**优势**：(1) 循环天然支持——step 发射之前的 event 就形成循环，不需要显式声明"回边"；(2) 解耦——step 只关心事件类型，不关心谁发射的；(3) 可扩展——加新 step 只需要让它监听已有 event 类型。**劣势**：(1) 控制流不可视——你要看所有 step 的类型签名才能推理出执行路径；(2) 调试难——事件流不留痕迹，出错了不知道卡在哪；(3) 容易意外触发——event 类型复用导致 step 被非预期地调用。

---

## 延伸阅读

- **LlamaIndex Blog：Introducing Workflows** ([llamaindex.ai/blog/introducing-workflows-beta](https://www.llamaindex.ai/blog/introducing-workflows-beta-a-new-way-to-create-complex-ai-applications-with-llamaindex))
  官方博客，解释了为什么从 DAG 转向事件驱动。必读——理解设计动机。

- **LlamaIndex 官方文档：Workflows** ([docs.llamaindex.ai/en/stable/module_guides/workflow](https://docs.llamaindex.ai/en/stable/module_guides/workflow/))
  API 参考和示例。重点看 self-correcting RAG 和 multi-step agent 两个 example。

- **Towards Data Science：Deep Dive into LlamaIndex Workflow** ([towardsdatascience.com](https://towardsdatascience.com/deep-dive-into-llamaindex-workflow-event-driven-llm-architecture-8011f41f851a/))
  第三方深度解析，有详细的事件流图和代码走读。补充官方文档没讲的细节。

- **Arize AI：LlamaIndex Workflows** ([arize.com/blog/llamaindex-workflows](https://arize.com/blog/llamaindex-workflows-a-new-way-to-build-cyclical-agents/))
  Arize 团队的分析，侧重可观测性和调试——这正是事件驱动架构的痛点。

- **配套阅读**：[LangGraph 深度解析](./langgraph) — 图编排范式的对照；[编排模式](./patterns) — 四种基础控制流模式；[LlamaIndex 框架](../frameworks/llamaindex) — LlamaIndex 生态全貌。
