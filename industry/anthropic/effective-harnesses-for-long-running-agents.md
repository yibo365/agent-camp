# 长周期 Agent 的有效 Harness

- 原文标题：Effective harnesses for long-running agents
- 原文链接：https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- 发布时间：2025-11-26
- 来源：Anthropic Engineering
- 主题：长周期 Agent、harness、上下文恢复

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

长周期 Agent 的失败经常不是模型“不聪明”，而是环境没有给它稳定支架：目标会漂移，状态会丢失，工具反馈不清楚，失败后不能恢复。文章总结 long-running agents 需要怎样的 harness。

## 核心内容

- harness 要保存任务状态，减少依赖单次上下文窗口。
- 工具接口要给出清晰反馈，让 Agent 知道动作是否成功。
- 长任务需要阶段性检查点，避免走偏后浪费大量时间。
- 恢复策略要成为设计的一部分，而不是失败后的补丁。

## 工程启发

- 长周期任务应当显式记录 plan、progress、blocking issues 和 next actions。
- 工具输出要短、准、可操作，避免日志淹没关键反馈。
- Agent harness 越清晰，模型越容易稳定工作。

## 和本站章节的关系

- [上下文工程](../../context/)
- [会话历史管理](../../context/history)
- [Agent 运行循环](../../agent/agent-loop)
- [流程编排 Workflow](../../workflow/)

## 面试追问

- 为什么长周期 Agent 不能只依赖长上下文？
- harness 如何防止目标漂移？
- 检查点和恢复策略应该包含哪些信息？
