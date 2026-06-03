# AIGC Camp

> 面向 AI Agent 工程师面试的系统化知识库：从 LLM、Prompt、RAG、工具调用，到 Agent 架构、多 Agent 协作、主流框架源码和生产工程化。

这个仓库不是零散的文章合集，而是一套按“面试会怎么问、工程上怎么做”组织的 Agent 学习路线。内容覆盖从底层模型原理到真实系统落地的完整链路，适合准备 Agent 工程师、LLM 应用工程师、AI Infra / AI 应用后端、RAG 工程、Coding Agent 相关岗位面试。

## 知识库覆盖什么

### 1. 基础能力

- **大模型基础 LLM**：Transformer、Tokenization、Embedding、预训练 / SFT / RLHF / DPO、推理参数、推理优化、模型选型、开源与闭源模型取舍。
- **提示词工程 Prompt Engineering**：Few-shot、CoT / ToT / GoT、Self-Consistency、ReAct、系统提示词、模板工程、Prompt Injection 与压缩。
- **上下文工程 Context Engineering**：上下文窗口、Lost in the Middle、长上下文模型、上下文压缩、会话历史、记忆系统、Context Caching、上下文污染。
- **工具调用 Tool Use**：Function Calling、Schema 设计、并行工具调用、错误处理、MCP、权限与沙箱、自定义工具开发。

### 2. RAG 与 Agent 架构

- **RAG 检索增强**：Naive RAG、Chunking、Embedding 模型、向量数据库、Hybrid Search、Reranking、HyDE / Step-back / Self-RAG、GraphRAG、Agentic RAG、RAG 评估。
- **Agent 核心理论**：Agent 定义、ReAct、Plan-and-Execute、Reflexion、Agent Loop、规划算法、记忆架构、自我纠错。
- **Workflow 编排**：LangGraph、LlamaIndex Workflows、Dify / Coze / FastGPT、顺序 / 并行 / 条件 / 循环编排、Workflow 与 Agent 的边界。
- **多 Agent 协作**：Supervisor、Swarm、Hierarchical、Network、A2A / ACP / AGNTCY 通信协议、Orchestrator-Worker、协作 / 辩论 / 投票、MetaGPT / ChatDev 案例。

### 3. 框架、源码与真实工程

- **主流 Agent 框架**：LangChain / LangGraph、LlamaIndex、Claude Agent SDK、OpenAI Agents SDK / Swarm、OpenClaw、Hermes Agent、Pi，以及框架选型决策树。
- **Agent 源码解析**：Claude Code、Codex CLI、Cursor、Cline / Roo Code、OpenHands、Aider、SWE-agent、GPT Engineer、pi-mono、Browser Use。
- **Agent 工程化**：Benchmark、SWE-bench、GAIA、tau-bench、LLM-as-Judge、Observability、成本优化、安全防护、限流与降级。
- **垂直领域 Agent**：Coding Agent、Deep Research、Browser / Computer Use、Voice Agent、Data Analysis Agent、Customer Service Agent。
- **一线工程分享**：OpenAI 与 Anthropic 工程博客导读，聚焦真实 Agent 系统的架构、评估、沙箱、上下文工程和长期任务实践。

## 面试重点

这个知识库的核心目标是帮你把 Agent 面试题从“会背概念”推进到“能解释设计取舍”。典型问题包括：

- **LLM 基础**：Transformer 为什么适合语言建模？Attention 的计算瓶颈在哪里？Temperature、top-p、max tokens 会怎样影响 Agent 稳定性？
- **Prompt 工程**：CoT、ReAct、Self-Consistency 分别解决什么问题？系统提示词应该写规则、角色还是工作流？Prompt Injection 为什么在工具调用里更危险？
- **上下文工程**：长上下文为什么不等于无限记忆？Lost in the Middle 怎么缓解？Agent Memory 和普通聊天历史有什么区别？
- **工具调用**：Function Calling 的 Schema 怎么设计才稳定？工具失败时应该重试、降级还是交给模型判断？MCP 解决了什么集成问题？
- **RAG 系统**：RAG 效果差应该先查切分、召回、重排还是生成？Hybrid Search 为什么常比单纯向量检索稳？如何评估 faithfulness、recall@k、citation precision？
- **Agent 架构**：ReAct 和 Plan-and-Execute 怎么选？Agent Loop 里什么时候停止？反思、自我纠错、记忆分别应该放在哪一层？
- **Workflow vs Agent**：什么需求适合确定性 Workflow？什么时候必须引入 Agent？LangGraph 的 State / Reducer / Checkpointer 为什么重要？
- **多 Agent**：Supervisor、Swarm、Orchestrator-Worker、Network 有什么差异？多 Agent 一定比单 Agent 强吗？如何避免协作成本超过收益？
- **框架选型**：LangGraph、OpenAI Agents SDK、Claude Agent SDK、LlamaIndex、CrewAI / AutoGen 类框架分别适合什么场景？
- **生产落地**：怎样做 Agent 评估？如何追踪一次失败的 tool call？如何控制 token 成本？Prompt Injection、越权工具调用、沙箱逃逸怎么防？
- **Coding Agent**：Claude Code、Codex CLI、Cursor、Cline、Aider 的设计差异是什么？为什么代码编辑工具通常要做 diff、permission、sandbox、checkpoint？

## 推荐学习路径

1. **先补底层概念**：LLM、Prompt、Context、Tool Use。
2. **再进入系统设计**：RAG、Agent Loop、Planning、Memory、Workflow。
3. **然后看协作与框架**：Multi-Agent、LangGraph、OpenAI Agents SDK、Claude Agent SDK、LlamaIndex。
4. **最后补生产问题**：Evaluation、Observability、Cost、Security、Rate Limiting。
5. **准备高阶面试**：读源码解析和 OpenAI / Anthropic 工程实践，训练“为什么这么设计”的回答能力。

## 目录结构

```text
.
├── llm/                 # 大模型基础
├── prompt/              # 提示词工程
├── context/             # 上下文工程
├── tools/               # 工具调用与 MCP
├── rag/                 # RAG 检索增强
├── agent/               # Agent 核心理论
├── workflow/            # 流程编排
├── multi-agent/         # 多 Agent 协作
├── frameworks/          # 主流 Agent 框架
├── source/              # Agent 源码解析
├── engineering/         # Agent 工程化
├── vertical/            # 垂直领域 Agent
├── industry/            # 一线工程分享
└── index.md             # 首页
```

## 本地查看

```bash
npm install
npm run dev
```

构建静态站点：

```bash
npm run build
```
