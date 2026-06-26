# Codex-Maxxing：长周期工作的 Agent 使用法

- 原文标题：Codex-maxxing for long-running work
- 原文链接：https://openai.com/index/codex-maxxing-long-running-work/
- 发布时间：2026-06-22
- 来源：OpenAI AI Adoption
- 主题：Codex、长周期工作、持续上下文、可验证步骤、人类监督

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

这篇文章配套一份由 Jason Liu 撰写的 guide，主题很直接：组织如何把 Codex 当成一个持续 workspace，而不是一次性 prompt 工具。它讨论的不是“怎么写一个更好的提示词”，而是怎么把大目标拆成可验证步骤、在多个工作流之间保持连续性、以及什么时候该把执行交给 Codex、什么时候人类必须接管。

这和本站的 [Loop Engineering](../../engineering/loop-engineering) 非常贴：长周期 Agent 的关键不是让模型一直思考，而是给它稳定的目标、状态、验证和监督边界。

## 核心内容

- OpenAI 把 Codex-Maxxing 定位为 long-running work 的实践指南。
- 核心思路是把 Codex 作为 persistent workspace，保留项目上下文并支撑复杂工作流。
- 文章强调把大目标拆成 verifiable steps，而不是一次性扔给 Agent。
- 需要维护多个 workstreams 的连续性，让工作跨越单次 prompt。
- 需要判断哪些执行适合委派给 Codex，哪些节点需要人类监督。

## 深度精读

“Codex-maxxing”这个词听起来有点玩笑，但背后的工程问题很严肃：当 Agent 能跑很久时，人类的工作从“给下一句提示词”变成“设计持续工作的轨道”。

长周期工作最怕三件事。

第一，**目标不可验证**。如果你让 Codex “把这个项目做得更好”，它可能永远有活可干，也可能很早自称完成。更好的任务是“把测试覆盖率从 62% 提到 75%，每次提交必须通过 CI，并列出新增测试覆盖的模块”。

第二，**上下文断裂**。Agent 跑半天后，重要决策、失败尝试、用户约束、临时文件位置都可能散落在对话里。persistent workspace 的价值，是把这些事实沉到文件、任务列表、测试、日志和 artifacts 里。

第三，**监督边界不清**。不是所有事都应该交给 Codex 自动做。写脚本、跑测试、生成候选方案可以委派；合并到主干、影响客户数据、改变安全策略，应该有人类确认。

所以这篇文章对 Agent 工程师最大的启发是：**长周期 Agent 的生产力来自可验证分解，不来自无限自主性**。

## 学习时重点看什么

- 看 persistent workspace：Agent 的记忆不应该只在聊天窗口里。
- 看 verifiable steps：每个子任务最好有测试、检查脚本、diff 或人工 review 标准。
- 看 workstreams：复杂任务往往不是一条线，而是多个并行分支。
- 看 human oversight：人类应该在高风险、不可逆、价值判断节点介入。

## 工程启发

可以把 Codex-Maxxing 落成一个简单清单：

| 维度 | 问题 |
|---|---|
| 目标 | 是否能被测试、指标或 checklist 验证？ |
| 状态 | 关键决策是否写入文件或任务系统，而不是只存在聊天历史？ |
| 分解 | 每个 workstream 是否能独立推进？ |
| 验证 | Codex 完成后跑什么命令证明它没骗自己？ |
| 接管 | 哪些动作必须由人类批准？ |
| 成本 | 长周期运行的 token、时间和 API 调用是否有预算？ |

这和 Anthropic 的 Dynamic Workflows 是两种互补视角：OpenAI 这篇更像“使用法和组织实践”，Anthropic 更像“产品能力和多 subagent 执行”。两者共同指向同一个方向：Agent 正在从对话工具变成可调度的工作系统。

## 和本站章节的关系

- [Loop Engineering](../../engineering/loop-engineering)：Codex-Maxxing 是 loop engineering 的使用侧实践。
- [Agent Harness](../../engineering/harness)：persistent workspace 需要任务状态、验证、checkpoint。
- [Agent Runtime](../../engineering/agent-runtime)：组织内长周期工作需要运行时治理，而不只是个人技巧。
- [可观测性](../../engineering/observability)：长期运行必须能追踪每个步骤和输出。
- [评估体系](../../engineering/evaluation)：verifiable steps 最终要进入回归集。

## 面试追问

- 一个长周期 Codex 任务应该如何设计成功标准？
- persistent workspace 和长上下文有什么区别？
- 什么样的任务不适合 Codex-Maxxing？
- 如何设计人类监督节点，既不打断效率，又不放大风险？

