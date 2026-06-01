# 用 MCP 执行代码：构建更高效的 Agent

- 原文标题：Code execution with MCP: Building more efficient agents
- 原文链接：https://www.anthropic.com/engineering/code-execution-with-mcp
- 发布时间：2025-11-04
- 来源：Anthropic Engineering
- 主题：MCP、代码执行、Agent 效率

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

Agent 经常需要计算、转换、验证和处理结构化数据。如果每一步都让模型在上下文里“脑算”，成本高、慢且容易错。通过 MCP 接入代码执行，Agent 可以把适合程序完成的部分交给环境。

## 核心内容

- MCP 让外部能力以标准方式暴露给模型和客户端。
- 代码执行适合处理数据转换、检验、统计、解析和生成中间文件。
- 把计算留在执行环境里，可以减少上下文占用和推理成本。
- 代码执行必须配合沙箱、资源限制和权限控制。

## 工程启发

- 高效 Agent 不应该把所有东西都塞给 LLM 处理。
- “模型负责判断，代码负责确定性计算”是常见高性价比架构。
- MCP server 的设计要兼顾易用性和安全边界。

## 和本站章节的关系

- [MCP 协议详解](../../tools/mcp)
- [自定义工具开发](../../tools/custom-tools)
- [工具沙箱与权限](../../tools/sandbox)
- [上下文压缩与摘要](../../context/compression)

## 面试追问

- 为什么代码执行能提高 Agent 效率？
- MCP 和普通函数调用有什么区别？
- 代码执行工具最需要防什么风险？
