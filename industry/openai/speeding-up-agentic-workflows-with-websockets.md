# 使用 Responses API 的 WebSocket 加速 Agent 工作流

- 原文标题：Speeding up agentic workflows with WebSockets in the Responses API
- 原文链接：https://openai.com/index/speeding-up-agentic-workflows-with-websockets/
- 发布时间：2026-04-22
- 来源：OpenAI Engineering
- 主题：Responses API、WebSocket、Agent loop、延迟优化

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

Agent loop 往往不是一次请求结束，而是模型思考、调用工具、回传结果、继续推理的多轮过程。每轮都重新建立请求，会把服务处理和网络往返放大成用户可感知的等待时间。

## 核心内容

- Codex 修 bug 时会反复读文件、编辑、运行测试，每一步都可能触发 Responses API 往返。
- 复杂任务的延迟来自 API 服务处理、模型推理和客户端工具执行三部分。
- WebSocket 持久连接减少重复建立连接和请求处理开销，让多轮工具调用更顺滑。
- 对 Agent 来说，低延迟不仅提升体验，也会改变可接受的工作流粒度。

## 工程启发

- Agent API 设计要面向“会话”和“循环”，不能只按单次 completion 设计。
- 工具调用密集型任务要优化往返次数和连接复用。
- 性能分析要把模型时间和非模型时间分开，否则容易误判瓶颈。

## 和本站章节的关系

- [工具调用](../../tools/)
- [Agent 运行循环](../../agent/agent-loop)
- [推理优化](../../llm/inference-optimization)

## 面试追问

- 为什么 Agent 工作流比普通聊天更依赖持久连接？
- TTFT、工具执行时间和 API 服务时间应该如何拆分？
- WebSocket 会给服务端状态管理带来哪些复杂度？
