# Claude Opus 4.8 与 Dynamic Workflows

- 原文标题：Introducing Claude Opus 4.8
- 原文链接：https://www.anthropic.com/news/claude-opus-4-8
- 发布时间：2026-05-28
- 来源：Anthropic News
- 主题：Claude Opus 4.8、Dynamic Workflows、并行 subagents、长周期任务

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

Opus 4.8 的发布文章表面上是模型升级，真正值得 Agent 工程师读的是它同时推出的 **Dynamic Workflows**。Anthropic 把 Claude Code 的任务边界往外推了一步：不再只是让一个 Agent 在一个 repo 里循环，而是让 Claude 规划大型任务、运行大量并行 subagents、验证产物，再把结果汇总给用户。

这说明 Coding Agent 的竞争焦点已经从“模型单步写代码能力”转向“长周期、多分支、可验证工作流”。模型更强当然重要，但真正决定生产可用性的，是它能不能把大任务拆开、并行推进、隔离失败、最后做验证。

## 核心内容

- Opus 4.8 在 Opus 4.7 基础上提升了 coding、agentic tasks 和专业知识工作能力。
- Claude Code 新增 Dynamic Workflows，官方描述为 research preview。
- Dynamic Workflows 可以让 Claude 规划任务，并在一次 session 里运行数百个并行 subagents。
- Claude 会在汇报前验证输出，面向代码库级迁移这类大规模任务。
- claude.ai 和 Cowork 增加 effort control，用户可以在质量、速度、token 消耗之间做选择。
- fast mode 速度提升到 2.5×，并且相较此前同类模式更便宜。

## 深度精读

Dynamic Workflows 可以理解成 Anthropic 对“一个 Agent 能不能做大项目”的回答：不是让单个上下文硬撑，而是让一个主控 Agent 负责任务拆解、并发调度和结果验证。

这和你在普通 Claude Code 里手动开多个终端、多个 worktree、多个 sub-agent 的做法很像，但产品化之后多了三件事。

第一，**任务规划变成系统能力**。用户不需要自己把迁移任务拆成 30 个子任务，Claude 可以先分析代码库，再决定哪些部分可以并行处理，哪些必须串行依赖。

第二，**并行 subagents 成为执行资源**。一个大迁移任务不再被单条 agent loop 的上下文和时间限制卡住，而是被拆成多个局部任务。每个 subagent 处理一部分，再由主控层聚合。

第三，**验证成为回报前置条件**。官方特别强调在 reporting back 之前验证输出。这句话很关键：多 Agent 并行最怕每个子任务都“看起来完成”，合起来却无法通过测试。验证不应该是用户最后补做的动作，而应该是 workflow 自己的出口条件。

## 学习时重点看什么

- 关注“数百个并行 subagents”背后的调度问题：状态怎么分发、结果怎么合并、冲突怎么处理。
- 关注“verify before reporting”：这是 Coding Agent 从 demo 到工程化的分水岭。
- 关注 effort control：Agent 产品开始把 token 预算和 reasoning intensity 显式暴露给用户。
- 关注长周期任务：代码库级迁移、批量修复、跨模块重构会成为 Coding Agent 的主战场。

## 工程启发

Dynamic Workflows 和本站几篇文章形成了一条很清晰的链：

| 站内概念 | Dynamic Workflows 对应形态 |
|---|---|
| [Loop Engineering](../../engineering/loop-engineering) | 不再手动续 prompt，而是系统调度多个执行循环 |
| [Orchestrator-Worker](../../multi-agent/orchestrator-worker) | 主控 Claude 拆任务，subagents 执行局部工作 |
| [Agent Harness](../../engineering/harness) | 每个子任务仍需要状态、工具、验证和恢复 |
| [可观测性](../../engineering/observability) | 并行任务必须能 trace 到每个 subagent 的输入和输出 |
| [评估体系](../../engineering/evaluation) | 大任务成败不能靠最终主观判断，要靠测试和回归集 |

如果你自己设计类似系统，最容易漏掉的不是“怎么启动很多 Agent”，而是下面这些问题：

- 每个 subagent 是否在隔离 workspace 里工作？
- 子任务结果如何防止互相覆盖？
- 主控 Agent 怎么判断某个子任务失败需要重试还是放弃？
- 验证失败时，是让原 subagent 修，还是换一个 checker？
- 并行工作产生的上下文和 artifact 怎么沉淀？

## 和本站章节的关系

- [Loop Engineering](../../engineering/loop-engineering)：Dynamic Workflows 是产品化 loop engineering 的典型例子。
- [多 Agent 架构模式](../../multi-agent/patterns)：它更接近 orchestrator-worker，而不是自由网络式 multi-agent。
- [调度者-工作者模式](../../multi-agent/orchestrator-worker)：理解主控层如何拆任务、并行、聚合。
- [Agent Harness 设计](../../engineering/harness)：每个 subagent 都需要 harness，不能只是裸模型调用。
- [成本优化](../../engineering/cost-optimization)：数百 subagents 会把 token 和并发成本推到新量级。

## 面试追问

- Dynamic Workflows 和普通 multi-agent 有什么区别？
- 并行 subagents 处理同一个代码库时，怎么隔离文件改动？
- 主控 Agent 如何判断子任务结果可信？
- effort control 为什么是 Agent 产品的重要 UX，而不只是模型参数？

