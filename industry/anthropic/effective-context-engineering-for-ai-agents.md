# AI Agent 的有效上下文工程

- 原文标题：Effective context engineering for AI agents
- 原文链接：https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- 发布时间：2025-09-29
- 来源：Anthropic Engineering
- 主题：上下文工程、prompt、工具、示例、长周期任务

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

Agent 失败常常不是因为模型能力不足，而是上下文组织混乱：指令太长、工具太多、历史太脏、示例不相关、检索内容噪声过大。文章系统讨论如何把 context 当作有限资源管理。

## 核心内容

- 上下文不是越多越好，关键是高信噪比。
- system prompt、工具定义、示例、历史、检索结果都会争夺同一个上下文预算。
- 工具说明要清晰但不冗长，避免模型在工具选择上迷路。
- 长周期 Agent 要主动压缩、分层和清理上下文。

## 工程启发

- 上下文工程是 Agent 产品的核心工程能力，不是 prompt 小技巧。
- 要把不同类型内容分区：指令、状态、任务、工具、证据和历史。
- 定期清理无用历史，比盲目依赖长上下文更可靠。

## 和本站章节的关系

- [上下文工程](../../context/)
- [上下文压缩与摘要](../../context/compression)
- [会话历史管理](../../context/history)
- [工具 Schema 设计](../../tools/schema-design)

## 面试追问

- context engineering 和 prompt engineering 有什么区别？
- 为什么工具列表过长会降低 Agent 表现？
- 长周期 Agent 如何避免上下文污染？
