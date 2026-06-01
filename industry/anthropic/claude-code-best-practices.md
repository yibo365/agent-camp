# Claude Code：Agent 编程最佳实践

- 原文标题：Claude Code: Best practices for agentic coding
- 原文链接：https://www.anthropic.com/engineering/claude-code-best-practices
- 发布时间：2025-04-18
- 来源：Anthropic Engineering
- 主题：Claude Code、Agentic coding、开发流程

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

Claude Code 不是普通代码补全工具，而是能读仓库、改文件、跑命令的编程 Agent。文章总结如何给它更好的上下文、任务拆分和验证反馈，让它更稳定地完成真实开发任务。

## 核心内容

- 给 Agent 的任务要具体，包含目标、约束、相关文件和验收方式。
- 让 Agent 先探索代码，再制定计划，能减少盲改。
- 小步提交、频繁测试和明确反馈比一次性大任务更可靠。
- 用户要审查 diff、运行测试，并把失败反馈给 Agent。

## 深度精读

这篇文章适合当作 Claude Code 使用手册来读。Agentic coding 和补全不同：补全是人在驾驶，模型补一小段；Coding Agent 是模型进入仓库，自己读文件、改代码、跑命令。用户给它的上下文质量，直接决定结果质量。

一个好任务通常包含：你想达到的用户效果，相关文件或模块，哪些行为不能改，如何验证成功。如果只说“修一下这个 bug”，Agent 可能会走很多弯路；如果补充复现步骤、错误日志、期望行为和测试命令，它就能更快收敛。

文章也强调迭代节奏。不要一次性让 Agent 重写半个系统，而是让它先调查、给计划、小步修改、跑测试、解释 diff。人类的价值在于设定方向、审查结果、指出偏差和决定取舍。使用 Coding Agent 的高手，不是完全放手，而是会设计反馈循环。

## 学习时重点看什么

- 给 Coding Agent 的输入要包含目标、上下文、限制和验收。
- 先探索再修改，比直接动手更可靠。
- 人类审查 diff 和测试结果仍然是关键环节。

## 工程启发

- Coding Agent 的使用方法本身就是一种工程流程。
- 任务越模糊，Agent 越容易做出看似合理但偏离目标的改动。
- 把仓库文档、测试和脚本整理好，会显著提升 Agent 效率。

## 和本站章节的关系

- [Coding Agent](../../vertical/coding-agent)
- [Claude Code 架构剖析](../../source/claude-code)
- [Agent 运行循环](../../agent/agent-loop)
- [评估体系](../../engineering/evaluation)

## 面试追问

- 使用 Coding Agent 时为什么要先让它探索代码？
- 如何把一个大开发任务拆给 Agent？
- 人类审查 Coding Agent 结果时重点看什么？
