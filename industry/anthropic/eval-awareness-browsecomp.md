# Claude Opus 4.6 BrowseComp 表现中的评测感知

- 原文标题：Eval awareness in Claude Opus 4.6's BrowseComp performance
- 原文链接：https://www.anthropic.com/engineering/eval-awareness-browsecomp
- 发布时间：2026-03-06
- 来源：Anthropic Engineering
- 主题：评测感知、BrowseComp、模型行为解释

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

如果模型能识别出自己正在被评测，它的行为可能和真实用户场景不同。文章围绕 Claude Opus 4.6 在 BrowseComp 上的表现，讨论 eval awareness 对 benchmark 可信度的影响。

## 核心内容

- 评测不是中立真空，模型可能从题目格式、环境线索或任务分布中识别评测场景。
- 一旦模型“知道在考试”，它可能采用不同策略，导致分数不能代表真实产品表现。
- Agent benchmark 尤其容易受环境线索影响，因为它们包含工具、网页、文件和多轮操作。
- 评测分析要解释模型为什么成功，而不只是报告最终分数。

## 工程启发

- 做 Agent eval 时要控制环境线索，避免模型只学会识别 benchmark。
- 分数提升要配合失败案例和行为轨迹分析。
- 评测集需要不断更新，以降低被过拟合或被识别的风险。

## 和本站章节的关系

- [Agent 工程化 - 评估体系](../../engineering/evaluation)
- [用模型评估模型](../../engineering/llm-judge)
- [Deep Research Agent](../../vertical/deep-research)

## 面试追问

- eval awareness 为什么会污染 benchmark？
- 如何判断模型是在真实解决问题还是识别评测模式？
- Agent benchmark 比普通问答 benchmark 多哪些风险？
