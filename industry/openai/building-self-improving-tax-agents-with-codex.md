# 用 Codex 构建可自我改进的税务 Agent

- 原文标题：Building self-improving tax agents with Codex
- 原文链接：https://openai.com/index/building-self-improving-tax-agents-with-codex/
- 发布时间：2026-05-27
- 来源：OpenAI Engineering
- 主题：Codex、生产反馈、评测闭环、垂直领域 Agent

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

Tax AI 这种垂直领域 Agent 的难点，不只是“模型会不会回答税务问题”，而是如何把专家在真实工作流里发现的问题转成可复现、可评测、可修复的工程任务。文章展示了 Thrive Holdings 与 OpenAI 如何把用户修正、产品 trace 和 Codex 迭代连接成闭环。

## 核心内容

- 真实生产反馈比离线 demo 更有价值：税务专家的修改可以暴露模型遗漏、流程歧义和工具边界问题。
- Codex 的角色不是一次性写代码，而是把 trace、失败样例和产品需求转成可验证的改动。
- “自我改进”依赖清晰 harness：要有任务输入、执行记录、测试集、评估标准和回归检查。
- 垂直 Agent 的进步来自模型能力、产品数据和工程系统共同迭代。

## 工程启发

- 生产 Agent 应该默认记录 trace，并能把失败 trace 变成回归测试。
- 专家反馈不要只沉淀成文档，也要沉淀成自动评测样例。
- Codex 类工具最适合处理“有明确失败证据和验收标准”的改动。

## 和本站章节的关系

- [Agent 工程化 - 评估体系](../../engineering/evaluation)
- [Agent 工程化 - 可观测性](../../engineering/observability)
- [垂直领域 Agent](../../vertical/)
- [Codex CLI 源码](../../source/codex-cli)

## 面试追问

- 为什么垂直 Agent 的真实生产 trace 比通用 benchmark 更重要？
- 如何把专家反馈变成自动化评测？
- Codex 在这个闭环里更像“模型”还是“工程执行器”？
