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
