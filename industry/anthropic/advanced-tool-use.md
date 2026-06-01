# Claude Developer Platform 的高级工具使用

- 原文标题：Introducing advanced tool use on the Claude Developer Platform
- 原文链接：https://www.anthropic.com/engineering/advanced-tool-use
- 发布时间：2025-11-24
- 来源：Anthropic Engineering
- 主题：工具调用、Claude Platform、开发者能力

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

工具调用从“模型返回一个函数名和参数”演进到更复杂的工作流：模型可能需要多个工具、长结果、代码执行、外部状态和更细的控制。文章介绍 Claude 平台在高级工具使用上的能力演进。

## 核心内容

- 高级工具使用强调模型和工具之间的结构化协作。
- 工具定义要帮助模型理解何时调用、如何调用、失败时怎么处理。
- 开发者平台需要提供更好的调试、观测和控制能力。
- 工具调用能力越强，权限和安全边界越重要。

## 工程启发

- 工具 schema 不是 API 文档的复制品，而是给模型看的操作界面。
- 高级工具工作流要考虑错误恢复和多步状态。
- 工具调用平台要支持可观测性，否则很难定位失败原因。

## 和本站章节的关系

- [函数调用规范](../../tools/function-calling)
- [工具 Schema 设计](../../tools/schema-design)
- [错误处理与重试](../../tools/error-handling)
- [MCP 协议详解](../../tools/mcp)

## 面试追问

- 工具 schema 应该为模型优化哪些信息？
- 多工具调用时如何避免上下文污染？
- 工具平台应该暴露哪些调试信息？
