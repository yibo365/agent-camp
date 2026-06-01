# 三个近期问题复盘

- 原文标题：A postmortem of three recent issues
- 原文链接：https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues
- 发布时间：2025-09-17
- 来源：Anthropic Engineering
- 主题：事故复盘、可靠性、产品工程

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

AI 产品上线后会遇到传统软件问题，也会遇到模型行为、prompt、工具和基础设施交织的新问题。文章复盘三个近期问题，展示 Anthropic 如何定位、修复和总结。

## 核心内容

- 事故复盘要明确时间线、影响范围、根因和后续动作。
- AI 产品的问题可能跨越模型服务、产品逻辑、提示词和客户端。
- 用户反馈与内部观测要结合，单靠一边容易漏掉真实影响。
- 复盘的价值在于形成预防机制，而不只是解释事故。

## 工程启发

- Agent 产品要建立 postmortem 文化，把模型行为问题也纳入工程事故管理。
- 每次事故都应该产生监控、测试或流程改进。
- 透明复盘能帮助团队建立对 AI 系统可靠性的真实认识。

## 和本站章节的关系

- [可观测性](../../engineering/observability)
- [Agent 工程化 - 评估体系](../../engineering/evaluation)
- [错误处理与重试](../../tools/error-handling)

## 面试追问

- AI 产品事故复盘和传统后端事故复盘有什么不同？
- 如何定义模型行为问题的影响范围？
- 复盘后怎样避免同类问题重复发生？
