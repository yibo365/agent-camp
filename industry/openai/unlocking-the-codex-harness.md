# 解锁 Codex Harness：App Server 架构

- 原文标题：Unlocking the Codex harness: how we built the App Server
- 原文链接：https://openai.com/index/unlocking-the-codex-harness/
- 发布时间：2026-02-04
- 来源：OpenAI Engineering
- 主题：Codex Harness、App Server、JSON-RPC、双向协议

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

Codex 同时存在于 Web、CLI、IDE 扩展和 macOS app 等多个表面。如果每个客户端都自己实现一套 Agent loop，就会造成行为不一致和维护成本。App Server 的目标是把底层 Codex harness 暴露成客户端友好的双向协议。

## 核心内容

- Codex harness 是多个 Codex 产品共享的 Agent loop 与执行逻辑。
- App Server 通过双向 JSON-RPC 把 harness 能力提供给不同客户端。
- Agent loop 不是简单请求响应：需要流式状态、工具调用、用户输入、取消、恢复和错误处理。
- 一个好的协议层能让 Codex 被复用成 code reviewer、SRE agent 或 IDE 助手等不同产品形态。

## 工程启发

- Agent 平台应当把核心 loop 与 UI 表面解耦。
- 双向协议适合承载 Agent 这种长会话、多事件、多工具的交互模型。
- 产品化 Agent 时，状态同步、取消、恢复和权限提示都是协议设计的一部分。

## 和本站章节的关系

- [Agent 运行循环](../../agent/agent-loop)
- [MCP 协议详解](../../tools/mcp)
- [Codex CLI 源码](../../source/codex-cli)
- [流程编排 Workflow](../../workflow/)

## 面试追问

- 为什么 Agent loop 不适合普通单向 HTTP 请求模型？
- JSON-RPC 在 Codex App Server 中解决了什么问题？
- 如何设计一个能服务 Web、CLI、IDE 的统一 Agent 协议？
