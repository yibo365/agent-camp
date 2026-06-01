# 一线工程分享

OpenAI 和 Anthropic 的工程博客，是观察 Agent 产品如何真实落地的高信噪比窗口。本栏目把两家的公开工程分享整理成中文导读，保留原文标题、发布时间、来源链接和主题脉络，方便按问题快速检索。

> 说明：这里是中文导读与学习索引，不是逐字全文转载。完整技术细节请回到原文阅读。

## 本栏目内容

- [OpenAI Engineering 中文导读](./openai-engineering) — Codex、Responses API、实时语音、超算网络与访问系统
- [Anthropic Engineering 中文导读](./anthropic-engineering) — Claude Code、Agent harness、上下文工程、评测、安全与 MCP

## 适合怎么读

1. 想理解 **Coding Agent 怎么进入生产**，先读 OpenAI 的 Codex harness / Symphony，再读 Anthropic 的 Claude Code harness / auto mode。
2. 想补 **Agent 安全边界**，重点看沙箱、权限确认、containment、prompt injection probe。
3. 想补 **评测体系**，从 Anthropic 的 agent evals、infrastructure noise、AI-resistant evals 入手。
4. 想补 **上下文工程**，读 Anthropic 的 context engineering，再回到本站的 [上下文工程](../context/) 章节。

## 和本站章节的关系

- [Agent 工程化](../engineering/) 讲评估、观测、成本、安全这些通用工程问题。
- [Agent 源码解析](../source/) 讲 Claude Code、Codex CLI、Cursor、Cline 等系统的实现思路。
- 本栏目补充的是一线团队的真实工程复盘：哪些设计在生产里撑住了，哪些地方踩过坑。
