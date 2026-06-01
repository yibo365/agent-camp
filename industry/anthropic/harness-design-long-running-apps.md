# 长周期应用开发的 Harness 设计

- 原文标题：Harness design for long-running application development
- 原文链接：https://www.anthropic.com/engineering/harness-design-long-running-apps
- 发布时间：2026-03-24
- 来源：Anthropic Engineering
- 主题：长周期任务、应用开发、Agent harness

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

让 Agent 写一个小函数和让 Agent 长时间开发应用，是两类完全不同的问题。长周期应用开发需要稳定的任务输入、可恢复状态、可靠验证和清晰边界。文章围绕这些要求讨论 harness 设计。

## 核心内容

- harness 要为 Agent 提供一致的任务环境，而不是每轮对话临时拼 prompt。
- 长任务需要把目标、约束、当前状态和验收标准显式化。
- 应用开发任务要让 Agent 能运行、测试、观察和修复，而不是只生成代码。
- 可恢复性是核心能力：失败后要知道做到了哪一步，能从哪里继续。

## 工程启发

- 长任务 Agent 的关键不是更长上下文，而是更好的状态管理。
- 测试、日志和可视化反馈是应用开发 harness 的核心输入。
- 任务拆分要让每个子目标都有明确验证方式。

## 和本站章节的关系

- [Coding Agent](../../vertical/coding-agent)
- [Agent 运行循环](../../agent/agent-loop)
- [上下文工程](../../context/)
- [Agent 工程化 - 评估体系](../../engineering/evaluation)

## 面试追问

- 长周期应用开发和单次代码生成有什么本质区别？
- harness 如何帮助 Agent 恢复任务？
- 应用开发 Agent 的验收标准应该怎么写？
