# 构建高效 Agent

- 原文标题：Building effective agents
- 原文链接：https://www.anthropic.com/engineering/building-effective-agents
- 发布时间：2024-12-19
- 来源：Anthropic Engineering
- 主题：Workflow vs Agent、编排模式、工具使用

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

很多团队一上来就想做“完全自主 Agent”，但真实生产里，简单、可控、可预测的 workflow 往往更有效。文章提出一个重要原则：先用 workflow，只有当模型需要自主决策时再引入 Agent。

## 核心内容

- Workflow 是预先定义好的步骤和分支，Agent 是让模型动态决定下一步。
- 简单任务不要过度 Agent 化，确定性流程更容易调试和上线。
- 常见模式包括 prompt chaining、routing、parallelization、orchestrator-worker、evaluator-optimizer。
- 工具使用要围绕任务目标设计，避免为了“看起来智能”而增加复杂度。

## 深度精读

这篇文章是 Anthropic 最值得反复读的 Agent 工程文章之一。它的核心不是介绍一堆炫技模式，而是提醒开发者：先问任务需不需要自主性。很多业务流程其实步骤固定、分支清晰、成功标准明确，用 workflow 更便宜、更稳定、更容易调试。只有当任务需要模型根据中间结果动态决定下一步时，才值得引入 Agent。

文章里的几个模式可以按“自主性递增”理解。Prompt chaining 是把一个复杂任务拆成多步，每步输出给下一步；routing 是先分类再走不同流程；parallelization 是并行处理后合并；orchestrator-worker 是主模型拆任务、子模型执行；evaluator-optimizer 是一个模型生成，一个模型评估并推动迭代。它们并不是互斥架构，而是可以组合。

最重要的工程原则是：复杂性要有回报。引入 Agent loop、工具调用和多模型协作后，系统会更难测试、更难排障、更难控制成本。只有当它带来的任务适应性超过这些成本时，才是好设计。这也是本站 Workflow vs Agent 章节的底层判断框架。

## 学习时重点看什么

- 先用最简单可控的 workflow，必要时再升级成 Agent。
- 每种模式都要问：它增加了什么能力，也增加了什么复杂度？
- Agent 自主性越高，评测、观测和安全越要跟上。

## 工程启发

- 架构选择要从任务不确定性出发，而不是从概念时髦程度出发。
- 越自主的系统越需要评测、观测和安全边界。
- 多数生产系统会混合 workflow 和 agent，而不是二选一。

## 和本站章节的关系

- [工作流与 Agent 的边界](../../workflow/workflow-vs-agent)
- [流程编排模式](../../workflow/patterns)
- [Agent 核心理论](../../agent/)
- [多 Agent 协作](../../multi-agent/)

## 面试追问

- Workflow 和 Agent 的本质区别是什么？
- 什么场景应该避免使用 Agent？
- evaluator-optimizer 模式适合解决什么问题？
