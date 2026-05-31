# Agent 核心理论

Agent 不是工具的堆叠，而是一套"感知—决策—行动—反思"的认知架构。本章是理解所有上层 Agent 框架的基石。

## 本章内容

- [Agent 定义与认知架构](./definition) — 什么才算 Agent？Anthropic 与 OpenAI 的定义之争
- [ReAct 模式](./react-pattern) — 推理与行动交替的原始论文与实现
- [先规划后执行 Plan-and-Execute](./plan-execute) — 先规划后执行的范式与 ReWOO 变体
- [自我反思 Reflexion](./reflexion) — 自我反思与迭代改进
- [Agent 运行循环](./agent-loop) — 从用户输入到任务完成的完整循环
- [规划算法](./planning) — HTN、蒙特卡洛树搜索在 Agent 中的应用
- [记忆架构](./memory-arch) — MemGPT、Mem0、LangMem 实现剖析
- [自我纠错机制](./self-correction) — 错误检测、回滚、再尝试

## 学习路径

1. 从 **Agent 定义** 开始，明确 Agent / 工作流 / 聊天机器人的边界
2. 掌握 **ReAct** 这一最基础也最重要的模式（几乎所有上层框架的基础）
3. 学习 **运行循环**，理解一个完整任务是如何被推进的
4. 进阶方向：**自我反思** 让 Agent 学会复盘，**记忆架构** 让 Agent 拥有长期记忆
