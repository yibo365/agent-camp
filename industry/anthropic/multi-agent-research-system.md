# Anthropic 如何构建多 Agent 研究系统

- 原文标题：How we built our multi-agent research system
- 原文链接：https://www.anthropic.com/engineering/multi-agent-research-system
- 发布时间：2025-06-13
- 来源：Anthropic Engineering
- 主题：多 Agent、研究系统、任务委派

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

复杂研究任务往往需要搜索多个方向、比较证据、综合结论。单个 Agent 线性探索容易遗漏。文章介绍 Anthropic 如何构建多 Agent 研究系统，用 orchestrator 分派子任务，再合并结果。

## 核心内容

- 主 Agent 负责理解用户问题、拆分研究方向和综合最终答案。
- 子 Agent 负责并行搜索、读取资料和返回证据。
- 多 Agent 的优势来自并行探索和覆盖面扩大。
- 挑战在于去重、证据质量、子任务漂移和最终合成。

## 深度精读

这篇文章展示了多 Agent 在研究任务中的典型优势：广度。一个复杂问题往往有多个子方向，如果单 Agent 串行搜索，很容易受第一批结果影响而陷入局部。多 Agent 可以并行探索不同假设、来源和关键词，然后由主 Agent 汇总。

但多 Agent 研究系统不是把任务随便扔给一堆子 Agent。主 Agent 要做清晰的任务分解：每个子 Agent 查什么，不查什么，预期返回什么证据，如何标注来源和不确定性。否则多个子 Agent 会重复搜索、互相矛盾，最后反而增加汇总负担。

最终合成是难点。主 Agent 不应该简单拼接子 Agent 输出，而要比较证据质量、识别冲突、去重、保留引用，并明确哪些结论仍不确定。研究 Agent 的目标不是“写得像报告”，而是形成可追溯的证据链。

## 学习时重点看什么

- 多 Agent 研究系统的核心是任务分解和证据合成。
- 子 Agent 输出要包含来源、置信度和未解决问题。
- 并行探索适合信息广度需求高的问题。

## 工程启发

- 多 Agent 适合信息搜索和研究任务，但需要强汇总层。
- 子任务要尽量独立，避免多个 Agent 重复查同一方向。
- 最终答案必须保留证据来源和不确定性。

## 和本站章节的关系

- [多 Agent 协作](../../multi-agent/)
- [调度者-工作者](../../multi-agent/orchestrator-worker)
- [Deep Research Agent](../../vertical/deep-research)
- [RAG 检索增强](../../rag/)

## 面试追问

- 多 Agent 研究系统相比单 Agent 的优势是什么？
- orchestrator 如何判断子任务是否完成？
- 多个子 Agent 返回冲突证据时怎么办？
