# 用 Agent 编写有效的 Agent 工具

- 原文标题：Writing effective tools for agents — with agents
- 原文链接：https://www.anthropic.com/engineering/writing-tools-for-agents
- 发布时间：2025-09-11
- 来源：Anthropic Engineering
- 主题：工具设计、Agent 自举、tool ergonomics

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

给人用的 API 不一定适合给模型用。Agent 工具需要让模型容易判断何时调用、如何填参数、如何理解结果。文章讨论如何设计有效工具，并用 Agent 辅助编写这些工具。

## 核心内容

- 工具应该暴露任务语义，而不是底层实现细节。
- 参数要少而明确，返回值要可解释、可继续行动。
- 错误信息要告诉模型下一步该怎么修，而不是只抛异常。
- Agent 可以参与工具生成和迭代，但仍需要人类审查边界和安全。

## 工程启发

- 工具设计要从模型的“可用性”出发，而不是从工程师熟悉的 API 形态出发。
- 好工具能减少上下文和推理成本。
- 工具越强，权限、审计和失败处理越不能省。

## 和本站章节的关系

- [工具 Schema 设计](../../tools/schema-design)
- [自定义工具开发](../../tools/custom-tools)
- [错误处理与重试](../../tools/error-handling)
- [工具调用](../../tools/)

## 面试追问

- 什么样的 API 不适合作为 Agent 工具？
- 工具返回值应该怎样帮助模型继续行动？
- 如何用 Agent 辅助设计工具但避免安全漏洞？
