# Claude 跨产品隔离与约束

- 原文标题：How we contain Claude across products
- 原文链接：https://www.anthropic.com/engineering/how-we-contain-claude
- 发布时间：2026-05-25
- 来源：Anthropic Engineering
- 主题：Agent containment、沙箱、权限边界、产品安全

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

随着 Claude 从聊天助手变成能读文件、写代码、调用工具和协作办公的 Agent，风险不再只是“回答错了”，而是“做了不该做的事”。文章讨论 Anthropic 如何在 claude.ai、Claude Code 和 Claude Cowork 等产品中限制 Agent 的 blast radius。

## 核心内容

- 风险可以分成用户误用、模型误行为和外部攻击三类。
- containment 的核心不是让模型永远不犯错，而是让错误无法越过产品边界。
- 环境层防线包括沙箱、权限、资源隔离和网络限制。
- 模型层防线用于补足环境防线不可用的场景，例如识别越权请求和可疑外部内容。
- 多 Agent 系统会让人工逐步审批更难扩展，因此系统级边界更重要。

## 工程启发

- Agent 安全的第一原则是限制可造成的损失，而不是期待模型完全可靠。
- 任何能访问外部内容的 Agent 都要考虑间接 prompt injection。
- 人工确认适合高风险节点，但不能作为唯一安全机制。

## 和本站章节的关系

- [Agent 工程化 - 安全](../../engineering/security)
- [工具沙箱与权限](../../tools/sandbox)
- [提示词注入攻防](../../prompt/injection)
- [多 Agent 协作](../../multi-agent/)

## 面试追问

- blast radius 在 Agent 产品里具体指什么？
- 环境层防线和模型层防线分别能防什么？
- 多 Agent 系统为什么会放大 containment 难度？
