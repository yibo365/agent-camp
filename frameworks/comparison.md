---
title: Agent 框架选型决策树
description: 7 个主流 Agent 框架的横向对比——LangChain/LangGraph、LlamaIndex、Claude Agent SDK、OpenAI Agents SDK、OpenClaw、Hermes Agent、Pi 各自的最佳场景，以及如何避免"为了用框架而用框架"的反模式。
pageClass: frameworks-comparison-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">主流 Agent 框架</p>
  <h1>Agent 框架选型决策树</h1>
  <p class="doc-hero__lead">每个框架的 README 都说"我什么都能做"——选型最重要的不是看每家有什么功能，而是看在你的场景里哪些功能你真用得上、哪些是负担。本文用"用户问题倒推框架选择"的方式给出可执行的决策路径。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：进阶 / 决策</span>
    <span>核心问题：场景 → 约束 → 框架</span>
    <span>面试重点：选型理由 + trade-off 阐述</span>
  </div>
</section>

> **本文边界**：本文做横向决策对比，单个框架的深度剖析见各自的文章——[LangChain/LangGraph](./langchain)、[LlamaIndex](./llamaindex)、[Claude Agent SDK](./claude-agent-sdk)、[OpenAI Agents SDK](./openai-agents-sdk)、[OpenClaw](./openclaw)、[Hermes Agent](./hermes-agent)、[Pi](./pi)。

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>给一个具体业务场景（如"做内部知识库问答"），你的框架选型怎么推？</strong>
    <span>考工程判断——能不能从"用户需求 → 技术约束 → 框架选择"推导，而不是直接背答案。</span>
  </div>
  <div>
    <strong>什么场景下你会选择不用任何框架，直接用 LLM 厂商 SDK 写循环？</strong>
    <span>考反模式意识——框架不是万能的，简单场景过度工程化是常见错误。</span>
  </div>
  <div>
    <strong>LangChain 被骂"抽象太厚"，但仍是市占率最高的框架，怎么解释？</strong>
    <span>考行业认知——抽象厚 ≠ 没用，对于团队协作和生态整合，统一抽象有不可替代的价值。</span>
  </div>
  <div>
    <strong>Claude Agent SDK 和 OpenAI Agents SDK，技术选型时怎么决定？</strong>
    <span>考多维权衡——不只是"模型偏好"，还有团队既有 API key、合规要求、工具生态、cost。</span>
  </div>
  <div>
    <strong>多 Agent 协作场景，LangGraph、OpenAI Agents、Hermes Agent 各自的边界？</strong>
    <span>考对编排范式的理解——图状态机、Handoff、自主学习是三种不同思路。</span>
  </div>
  <div>
    <strong>个人/团队用的 AI 助手，你会选 OpenClaw 还是 Hermes Agent？</strong>
    <span>考产品定位辨析——OpenClaw 偏渠道整合，Hermes 偏自主学习，目标用户不同。</span>
  </div>
  <div>
    <strong>选型后发现框架不合适，迁移成本怎么估？怎么降低锁定风险？</strong>
    <span>考长期工程意识——锁定风险评估、抽象隔离、迁移路径预留。</span>
  </div>
</div>

---

## 选型的第一性原则

在跳进框架对比表之前，先问三个问题。这三个问题答完，候选范围通常已经收窄到 1-2 个：

```
问题 1：你的核心任务是什么？
  ├─ RAG / 知识问答 → LlamaIndex（重）/ LangChain（中）
  ├─ 编程 Agent / Code Gen → Claude Agent SDK / Pi
  ├─ 多 Agent 客服 / 工作流分流 → OpenAI Agents SDK / LangGraph
  ├─ 个人 AI 助手（跨渠道）→ OpenClaw / Hermes Agent
  └─ 自主任务执行（学习改进）→ Hermes Agent

问题 2：模型选择有约束吗？
  ├─ 必须 Claude → Claude Agent SDK 优先
  ├─ 必须 GPT → OpenAI Agents SDK 优先
  ├─ 多 provider / 本地模型 → LangChain / Hermes / Pi
  └─ 数据不能出公司网络 → 本地模型 + 自部署框架（避开 SaaS）

问题 3：你的团队上有什么约束？
  ├─ Python 强 / TypeScript 弱 → 优先 Python 框架（LangChain/LlamaIndex/Hermes）
  ├─ 已有 K8s / 微服务架构 → LangGraph + Postgres checkpointer 适合
  ├─ 小团队 / 快速原型 → OpenAI Agents SDK（最轻）/ Claude Agent SDK（开箱）
  └─ 企业合规要求高 → 框架必须能审计（trace + permission）
```

---

## 7 个框架的核心矩阵

把所有维度横向放一起：

| 维度 | LangChain/LangGraph | LlamaIndex | Claude Agent SDK | OpenAI Agents SDK | OpenClaw | Hermes Agent | Pi |
|---|---|---|---|---|---|---|---|
| **核心定位** | 通用 Agent 框架 | RAG 数据平台 | Claude 编程 Agent | 多 Agent 编排 | 个人 AI 助手网关 | 自主学习 Agent | 极简编程 Agent |
| **主力语言** | Python/TS | Python | Python/TS | Python/TS | TypeScript | Python | TypeScript |
| **模型支持** | 多（统一抽象） | 多 | Claude only | OpenAI only | 多 | 200+ | 15+ |
| **多 Agent 能力** | 强（图状态机） | 中（Workflows） | 中（Subagent） | 强（Handoff） | 中（多 Agent 路由） | 强（自学习） | 弱（自己拼） |
| **HITL** | 强（interrupt + checkpoint） | 弱 | 中（Permission） | 中（Guardrail） | 中（DM pairing） | 弱 | 弱 |
| **持久化** | Checkpointer 多后端 | 弱 | 无 | 无 | 文件系统 | 三层记忆 | 树状 Session |
| **可观测** | LangSmith（成熟） | LlamaTrace（新） | 弱（要自己埋） | 内置 Tracing | 弱 | 弱 | 弱 |
| **内置工具** | 无（生态丰富） | 无（生态丰富） | 多（最完整） | 中 | 多（含浏览器/cron） | 多（60+） | 无（要装 Extension） |
| **学习曲线** | 陡 | 中 | 低 | 极低 | 低 | 中 | 中 |
| **GitHub star** | 95k+ / 8k+ | 35k+ | 35k+ | 17k+ | 376k | 176k | 58k |
| **首次稳定版** | 2022 / 2024 | 2022 | 2024 | 2025 | 2024 | 2025 | 2024 |

注：star 数为撰文时数据，会变化。star 不直接反映质量，仅作为社区活跃度参考。

---

## 七个常见业务场景的推荐

不要按框架功能列表选，按你要做什么选。

### 场景 1：企业内部知识库问答

**需求**：员工问"我们公司的报销流程"，从内部文档准确回答 + 引用来源。

```
推荐路径：LlamaIndex（数据层）+ 简单 Chat（不需要 Agent）
```

**为什么**：核心是"读取 + 索引 + 检索 + 引用"，本质是 RAG 而非 Agent。LlamaIndex 在 RAG 上的工程化最深——LlamaParse 处理表格、HierarchicalNodeParser 处理长文档、metadata filtering 做权限隔离。如果加 Agent 反而引入不必要的复杂度（推理失败、循环、token 浪费）。

**反模式**：用 LangGraph 做这事会非常累——你需要自己实现 LlamaIndex 提供的开箱组件。

### 场景 2：编程 Agent（类似 Claude Code / Cline）

**需求**：让 Agent 读代码、改代码、跑测试、提交 PR。

```
推荐路径：
  Claude 生态 → Claude Agent SDK（开箱 90% 功能）
  多模型支持 → Pi（最小内核 + 自选扩展）
  完全自主可控 → 用 Anthropic/OpenAI SDK 自己写
```

**为什么**：编程 Agent 的关键不是"调 LLM"，而是"工具集 + permission + 大文件处理"。Claude Agent SDK 把这些工程问题都内置了（Bash 超时、Read 分页、Edit 精确替换、Glob 递归）。从 0 写要踩同样的坑。

**Pi 的差异化**：如果你需要把 Agent 嵌入到 CI/CD 或其他工具链，Pi 的 RPC / Print 模式比 Claude Agent SDK 灵活。

### 场景 3：多 Agent 客服分流

**需求**：用户问题进来 → 判断类型 → 转给对应专家 Agent → 处理并回复。

```
推荐路径：
  简单分流（2-5 个 Agent，线性流程）→ OpenAI Agents SDK（Handoff 最轻）
  复杂工作流（环、HITL、长期任务）→ LangGraph
```

**为什么**：OpenAI Agents SDK 的 Handoff 模型就是为这场景设计的，代码极简。但它擅长线性 handoff（A → B → C），不擅长复杂分支和循环。

举个**反例**：如果你的客服流程是"分流 → 处理 → 若不满意 → 升级 → 若仍不满意 → 转人工 → 等待 12 小时 → 自动 follow-up"——OpenAI Agents SDK 做这种长流程很挣扎，LangGraph 的 checkpoint + interrupt 才是合适抽象。

### 场景 4：个人 AI 助手（WhatsApp/Telegram 跨渠道）

**需求**：在 WhatsApp 上问 Agent 帮你查邮件、订机票、整理 Notion；切到电脑上继续聊。

```
推荐路径：
  开箱即用 + 文档完整 → OpenClaw
  追求自主学习 / 研究 → Hermes Agent
  自己造轮子 → LangGraph + 自己接渠道 webhook（不推荐）
```

**为什么**：OpenClaw 和 Hermes Agent 都是为这场景而生——20+ 渠道适配、cron job 调度、本地数据主权。用 LangGraph 自己拼意味着要写 WhatsApp Web client、Telegram Bot API、iMessage 桥接……这是 6 个月工作量。

**两者怎么选？**

- **OpenClaw**：文档好、社区大、Channel Adapter 成熟。适合"我就想要个能用的助手"
- **Hermes Agent**：自我学习是真亮点。适合"我想研究 Agent 的长期演化、且能接受相对粗糙的文档"

### 场景 5：金融/医疗/法律的合规 Agent

**需求**：行业 Agent，所有操作必须审计、敏感字段不能进 LLM、输出必须脱敏。

```
推荐路径：
  LangGraph（checkpoint + LangSmith）
  或 OpenAI Agents SDK（Guardrails + 内置 Tracing）
```

**为什么**：合规场景的核心是**可审计 + 可追溯**。LangGraph 的 checkpoint 让每一步可回放，LangSmith 提供完整的执行轨迹。OpenAI Agents SDK 的 Tracing 也强，但模型锁定在 GPT（合规上对供应商选择有要求）。

**避开**：OpenClaw / Hermes / Pi——它们的可观测能力不足以满足金融级审计需求。

### 场景 6：长期运行的自主任务（数据迁移、批量处理）

**需求**：让 Agent 处理 10 万条记录，跑几小时甚至几天，中间崩了要能恢复。

```
推荐路径：LangGraph（PostgresSaver checkpointer）
```

**为什么**：这场景只有 LangGraph 是开箱解决方案——Checkpointer 把每个 superstep 后的状态持久化，进程崩了重启从最近 checkpoint 继续。OpenAI Agents SDK 和 Claude Agent SDK 都没有这个能力，要自己实现"任务恢复"很复杂。

### 场景 7：研究/教学/原型探索

**需求**：探索 Agent 的某个新模式（如 Reflexion、Tree of Thoughts），快速验证想法。

```
推荐路径：
  纯论文复现 → 用 Anthropic/OpenAI SDK 直接写循环（最透明）
  需要工具调用 + 一些工程便利 → OpenAI Agents SDK（最少抽象）
```

**为什么**：研究场景最怕"框架黑盒"——你实现 Reflexion 时希望对每一步 prompt 完全可控，框架的内置 loop 反而碍事。Anthropic SDK 写个 80 行循环最干净。

---

## 反模式：什么时候不用框架

很多新手把"用框架"等同于"专业"。其实在以下场景，**裸写 SDK 反而更好**：

**反模式 1：单次 LLM 调用**

```python
# 不要：
chain = PromptTemplate | LLM | StrOutputParser
result = chain.invoke({"q": "..."})

# 直接：
result = client.messages.create(messages=[...]).content[0].text
```

LangChain 的抽象在单次调用时是纯负担——多 5 个 import、多 3 层调用栈、错了 traceback 难看。

**反模式 2：固定 3 步流程（不需要 Agent 推理）**

```
流程：用户上传文档 → OCR → 翻译 → 返回
```

这是确定性 pipeline，不需要 LLM 决策。用普通 Python 函数串起来就行，套 LangGraph 是"杀鸡用牛刀"。

**反模式 3：超低延迟要求（< 500ms）**

框架都有开销（中间件、tracing、回调）。如果你的产品要求 P99 < 500ms，框架开销可能占 20-30%。这种场景直接调 SDK + 自己写最简循环。

**反模式 4：团队对框架不熟悉、上线时间紧**

学习 LangGraph 的 State/Reducer/Checkpointer 至少要一周。如果项目两周要上线，用熟悉的工具——哪怕代码丑一点。技术债比延期可控。

---

## 怎么降低框架锁定风险

框架选了不一定永远合适。降低未来迁移成本的关键技巧：

**技巧 1：业务逻辑和框架代码分离**

```python
# 不要：业务逻辑写在 LangChain 的 Chain 里
chain = prompt | llm | (lambda x: business_logic(x))

# 推荐：业务逻辑放普通函数，框架只做编排
def core_logic(input_data):
    # 纯业务，不依赖任何框架
    return processed

# Framework 层只负责"什么时候调它"
chain = prompt | llm | core_logic
```

迁移时核心业务函数原样保留，只重写 chain 编排。

**技巧 2：把 LLM 调用抽象成自己的 interface**

```python
# 不要直接散用 openai / anthropic 客户端
from anthropic import Anthropic
client = Anthropic()

# 推荐：自己抽象一层
class LLMClient:
    def __init__(self, provider="anthropic"):
        ...
    def chat(self, messages, tools=None) -> Response:
        ...

llm = LLMClient()
```

底层用什么 SDK 都行，业务代码不变。这是 LangChain 给你做的事——但你自己做更可控。

**技巧 3：把 prompt 和 tool schema 存在配置里**

```yaml
# prompts.yaml
triage:
  instructions: |
    You are the first responder...
  handoffs: [support, sales]

support:
  instructions: |
    You handle support...
  tools: [lookup_order, refund]
```

切换框架时，prompt 不动，只改加载方式。

---

## 框架的未来：会收敛吗

这是个开放问题，但有几个观察：

```
2023：百花齐放期
  → LangChain、LlamaIndex、Semantic Kernel、Agno 等通用框架……
  → 每家都说自己能干所有事

2024：分化期
  → LangChain 拆出 LangGraph（编排 vs 组件分离）
  → LlamaIndex 推 Workflows（学 LangGraph）
  → OpenAI/Anthropic 推官方 SDK（厂商进场）

2025：场景化期
  → Pi、OpenClaw、Hermes 出现，专注垂直场景
  → 通用框架 vs 垂直框架的差异化清晰
  → "什么都能做"的框架反而被"做好一件事"的框架蚕食
```

**预测**：未来 1-2 年会出现"工程化的统一接口"（类似 OpenAI API 之于模型调用），让用户能在 LangGraph、OpenAI Agents SDK、Claude Agent SDK 之间无缝迁移。但短期内每家仍会强化自己的差异化能力。

对开发者的建议：**不要赌单一框架。学透底层原理（Agent loop、工具调用、状态管理、HITL），框架只是其上的薄壳**。

---

## 面试题深度解析

**Q1: 给一个具体业务场景，你的框架选型怎么推？**

- **30 秒版本**：永远先问三件事——核心任务（RAG / 编程 / 多 Agent / 个人助手 / 自主任务）、模型约束（必须 Claude？GPT？本地？）、团队约束（语言、运维能力、合规）。三个问题答完候选范围通常剩 1-2 个，剩下的是看团队偏好。
- **追问：如果你只能用 Anthropic API，多 Agent 客服选什么？** Claude Agent SDK + 用 Subagent（Task tool）做角色分工。但要承认它不是为多 Agent 客服设计的——Subagent 是"主 Agent 派生子任务"模型，不是 OpenAI Agents SDK 的对等 Handoff 模型。复杂场景可以考虑 LangGraph + Anthropic 模型。
- **追问：如果客户给 1 周时间出 demo，你会怎么选？** 看 demo 目的。给投资人看效果——用最快出活的（OpenAI Agents SDK 或 Claude Agent SDK，半天能跑通）。给技术 due diligence 看架构——用 LangGraph（显式状态机更专业）。Demo 阶段不用纠结长期锁定——能让客户看到价值最重要。

**Q2: LangChain 被骂"抽象太厚"，为什么仍是市占率最高的？**

- **30 秒版本**：抽象厚 ≠ 没用。LangChain 的价值不只是"省 LLM 调用代码"，而是"团队协作时的统一语言"——新人加入项目能快速理解 Chain 是什么、Tool 是什么、Retriever 是什么。生态层面，几百个 Loader、几十个 vector store 集成都是开箱即用。这对大公司项目的价值远超"省几行代码"。
- **追问：那为什么开发者一边骂一边用？** 因为 LangChain 早期（2023 上半年）确实有抽象失败的部分——Chains 的多层嵌套、Agent 的黑盒 loop、各种 Memory 类的混乱。LCEL（2023 下半年）+ LangGraph（2024）重构后好得多，但"抽象太厚"的口碑已经形成。技术债的遗产。
- **追问：如果让你重新设计 LangChain，会改什么？** 把"组件"和"编排"严格分离（这正是 LangGraph 在做的）。删掉所有"Legacy"的 Chain 子类（LLMChain、RetrievalQAChain），只保留 LCEL。把 Memory 重新设计成 LangGraph 的 State——没必要单独抽象。简化不少。

**Q3: 选型后发现框架不合适，怎么降低迁移成本？**

- **30 秒版本**：核心是"业务逻辑和框架代码分离"——框架只做编排，业务逻辑放纯函数；LLM 调用抽象成自己的 interface 不直接散用 SDK；prompt 和 tool schema 放配置文件不写死代码里。这样迁移时核心代码不动，只重写编排层。
- **追问：能完全做到 0 锁定吗？** 不能。任何框架都有特有抽象——LangGraph 的 State/Reducer、OpenAI Agents 的 Handoff、Claude Agent SDK 的 Permission，迁移时这些必然要重写。但通过分层，重写量可以从"全部"降到"20-30%"。
- **追问：什么时候应该接受锁定，什么时候应该坚持解耦？** 看预期生命周期。3-6 个月的项目（创业 PoC、试水产品），锁定换速度是合算的。3 年以上的核心产品，必须解耦——团队规模会扩大、人员会流动、技术栈会演进，3 年间几乎肯定会迁移至少一次。中间的 1-2 年项目，看团队规模和模型不确定性——模型/框架变动越多，越要解耦。

---

## 延伸阅读

- **各框架自身的深度文章**：在跨框架对比之外，理解每个框架的内部设计才能做精准选型——[LangChain/LangGraph](./langchain)、[LlamaIndex](./llamaindex)、[Claude Agent SDK](./claude-agent-sdk)、[OpenAI Agents SDK](./openai-agents-sdk)、[OpenClaw](./openclaw)、[Hermes Agent](./hermes-agent)、[Pi](./pi)
- **Building Effective Agents** Anthropic 2024 年的博客 — 不是教程，是关于"什么时候应该用 Agent、什么时候不该"的思考。选型前必读
- **LangChain Decision Guide** [python.langchain.com/docs/concepts](https://python.langchain.com/docs/concepts/) — LangChain 自己的"什么时候用 LangChain vs LangGraph"指南
- **Awesome AI Agents** [github.com/e2b-dev/awesome-ai-agents](https://github.com/e2b-dev/awesome-ai-agents) — 持续更新的 Agent 生态列表，看新框架出现时的横向对照
- **The Bitter Lesson** Rich Sutton 的经典文章 — 提醒你"通用方法 + 算力"长期胜过"领域 trick"，对框架选型有底层启示——别赌某个特定抽象会永远存在
