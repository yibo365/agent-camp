# 揭开 AI Agent 评测的面纱

- 原文标题：Demystifying evals for AI agents
- 原文链接：https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- 发布时间：2026-01-09
- 来源：Anthropic Engineering
- 主题：Agent eval、成功标准、任务设计

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

Agent eval 经常被说得很玄，但本质是工程化的反馈系统：定义任务、运行 Agent、收集轨迹、判断是否成功、分析失败并迭代。文章用更清晰的方式拆解 Agent 评测应该怎么做。

## 核心内容

- Agent eval 要从真实任务出发，而不是只测孤立问答。
- 成功标准要明确、可重复，并尽量减少人工主观性。
- 轨迹分析比最终答案更重要，因为 Agent 可能在工具调用、规划或恢复阶段失败。
- 好的 eval 应该能指导下一步改进，而不只是给一个分数。

## 工程启发

- 每个生产 Agent 都应该有自己的小型高质量评测集。
- 评测样例要覆盖典型任务、边界任务和历史失败任务。
- LLM-as-judge 可以用，但要有校准和抽检。

## 和本站章节的关系

- [Agent 工程化 - 评估体系](../../engineering/evaluation)
- [用模型评估模型](../../engineering/llm-judge)
- [Agent 运行循环](../../agent/agent-loop)

## 面试追问

- Agent eval 和普通 LLM eval 有什么不同？
- 为什么要看工具调用轨迹？
- 如何设计一个能驱动迭代的评测集？
