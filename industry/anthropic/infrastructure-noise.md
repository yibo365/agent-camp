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

## 深度精读

这篇文章把 coding eval 里经常被忽略的“脏东西”拿出来讲。一个 Agent 没通过任务，可能是模型没有理解 issue，也可能是依赖安装失败、测试 flaky、网络超时、包版本变化、容器资源不足，甚至是评测脚本本身不稳定。如果不区分这些原因，模型团队会被错误信号带偏。

基础设施噪声最危险的地方，是它会伪装成模型能力波动。同一个模型，同一个任务，多跑几次结果不同；或者 A 模型看似强于 B 模型，其实只是某次运行环境更顺。对外报告 benchmark 时如果只给单个 pass rate，就会掩盖这种不确定性。

实际工程里，评测系统应该像生产系统一样有观测能力：记录镜像版本、依赖安装日志、测试命令、退出码、网络状态、资源限制和完整工具轨迹。只有先把环境失败剥离，才能真正比较模型和 agent harness 的差异。

## 学习时重点看什么

- Coding Agent 评测要区分模型失败、工具失败和环境失败。
- benchmark 分数最好有重复运行和置信区间。
- 评测系统本身也需要可靠性工程。

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
