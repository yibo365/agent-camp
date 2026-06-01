# 超越限流：扩展 Codex 与 Sora 的访问机制

- 原文标题：Beyond rate limits: scaling access to Codex and Sora
- 原文链接：https://openai.com/index/beyond-rate-limits/
- 发布时间：2026-02-13
- 来源：OpenAI Engineering
- 主题：限流、用量计量、credits、访问控制

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

传统 rate limit 只关心单位时间请求数，但 Codex 和 Sora 这类产品的资源消耗更复杂：一次任务可能持续很久、占用不同资源、产生异步结果。文章讨论访问控制如何从简单限流演进为更细粒度的实时用量系统。

## 核心内容

- Codex 和 Sora 的请求成本不容易用固定 QPS 表达。
- credits、实时用量和额度系统可以比硬性 rate limit 更贴近资源真实消耗。
- 访问系统要兼顾公平性、计费正确性、滥用防护和用户体验。
- 规模化产品需要在资源紧张时提供可解释的限制，而不是让用户遇到不可理解的失败。

## 工程启发

- Agent 产品的成本单位可能是任务、工具调用、执行时长、模型 token 和外部资源的组合。
- 限流系统必须和计量、计费、队列、降级策略联动。
- 用户可见的限制应当清楚说明原因和恢复方式。

## 和本站章节的关系

- [限流与降级](../../engineering/rate-limiting)
- [成本优化](../../engineering/cost-optimization)
- [Agent 工程化](../../engineering/)

## 面试追问

- 为什么 QPS 限流不适合所有 AI 产品？
- 如何给长时间运行的 Agent 设计用量计量？
- credits 系统和 rate limit 分别解决什么问题？
