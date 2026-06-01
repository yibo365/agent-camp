# 量化 Agent 编程评测中的基础设施噪声

- 原文标题：Quantifying infrastructure noise in agentic coding evals
- 原文链接：https://www.anthropic.com/engineering/infrastructure-noise
- 发布时间：2026-02-05
- 来源：Anthropic Engineering
- 主题：Coding eval、基础设施噪声、可重复性

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

Coding Agent 评测经常把最终通过率当成模型能力，但运行环境本身也会制造噪声：依赖下载失败、网络波动、测试不稳定、容器差异都可能让结果偏移。文章讨论如何量化这些非模型因素。

## 核心内容

- Agentic coding eval 的结果由模型、工具、环境、网络和测试共同决定。
- 基础设施噪声会让同一模型在同一任务上产生不同结果。
- 需要区分模型失败、环境失败和评测 harness 失败。
- 可重复性是评测可信度的前提。

## 工程启发

- 评测系统要记录完整执行日志、依赖状态和环境版本。
- 对 benchmark 结果做统计时，应该报告置信区间或重复运行结果。
- 不稳定任务要标记或剔除，否则会误导模型迭代方向。

## 和本站章节的关系

- [Agent 工程化 - 评估体系](../../engineering/evaluation)
- [Coding Agent](../../vertical/coding-agent)
- [可观测性](../../engineering/observability)

## 面试追问

- Coding Agent 评测中的“非模型失败”有哪些？
- 如何设计可重复的 SWE-bench 类评测？
- 为什么单次 pass rate 不够可靠？
