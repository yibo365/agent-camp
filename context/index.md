# Context Engineering

上下文工程是 2025 年以来 Agent 领域最重要的范式转变。本章覆盖上下文设计、管理、压缩与缓存。

## 本章内容

- [上下文窗口与位置偏置](./window-bias) — "中间迷失"（Lost in the Middle）现象
- [长上下文模型对比](./long-context) — Claude 200k、Gemini 2M、Qwen 1M 实测
- [Context Engineering 面试深挖](./context-engineering-interview) — 匿名真实面经里的上下文追问链
- [上下文压缩与摘要](./compression) — 摘要、抽取、LLMLingua
- [记忆系统](./memory) — 短期 / 长期 / 情景 / 语义记忆架构
- [Memory Governance 面试深挖](./memory-governance-interview) — 写入策略、去重、冲突、TTL、权限与召回治理
- [会话历史管理](./history) — 滑动窗口、摘要轮转、向量检索召回
- [上下文缓存](./caching) — Anthropic / Gemini / DeepSeek 三家缓存机制对比
- [上下文污染与清理](./pollution) — 错误信息累积、Token 中毒、清理策略

## 学习路径

1. 先理解 **上下文窗口** 的本质局限（位置偏置 + 噪声 + 成本）
2. 读 **Context Engineering 面试深挖**，把窗口、压缩、缓存、RAG、memory 串成一条面试回答链
3. 学习 **记忆系统** 与 **会话历史管理** 这两个生产必备工具
4. 准备长期记忆追问时看 **Memory Governance 面试深挖**，重点补写入、冲突、过期和权限
5. 重点掌握 **上下文缓存**，这是降低 90% 成本的关键
6. 进阶问题看 **上下文污染**，长会话 Agent 必踩的坑
