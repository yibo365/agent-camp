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
