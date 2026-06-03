# Agent 核心理论

Agent 是一套围绕目标、环境、工具、状态和反馈组织起来的执行系统。本章面向 Agent 工程师面试：你要能讲清模式，也要能讲清失败时怎么定位。

## 本章内容

- [Agent 定义与认知架构](./definition) — Agent / Workflow / Chatbot 的边界
- [ReAct 模式](./react-pattern) — 推理与行动交替的原始论文与实现
- [先规划后执行 Plan-and-Execute](./plan-execute) — Planner / Executor 分工与 ReWOO 变体
- [自我反思 Reflexion](./reflexion) — 失败反馈如何写回下一轮尝试
- [Agent 运行循环](./agent-loop) — 从用户输入到任务完成的状态机
- [规划算法](./planning) — ToT、MCTS、任务图在 Agent 中的用法
- [记忆架构](./memory-arch) — MemGPT、Mem0、LangMem 的工程取舍
- [Agent Skills](./skills) — 把稳定经验做成可加载能力包
- [自我纠错机制](./self-correction) — 检测、回滚、重试和拒绝

## 学习路径

1. 从 **Agent 定义** 开始，明确 Agent、工作流、聊天机器人的边界。
2. 掌握 **ReAct**，它是很多工具调用 Agent 的最小可用模式。
3. 学习 **运行循环**，理解一个完整任务如何被推进、暂停、失败和恢复。
4. 进阶学习 **规划、反思、记忆、Skills、纠错**。面试里真正拉开差距的，通常是你能不能说清这些模块什么时候该加、什么时候该删。
