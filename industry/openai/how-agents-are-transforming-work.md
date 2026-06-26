# OpenAI：Agent 如何改变工作

- 原文标题：How agents are transforming work
- 原文链接：https://openai.com/index/how-agents-are-transforming-work/
- 发布时间：2026-06-25
- 来源：OpenAI Company / Economic Research
- 主题：Codex、agentic work、长周期任务、非开发者采用、组织变革

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

这篇文章不是普通产品发布，而是 OpenAI 用 Codex 使用数据解释一个趋势：工作里的 AI 交互正在从“短对话”转向“长周期委派任务”。ChatGPT 这类对话工具更像即时问答，Codex 这类 Agent 可以在分钟到小时尺度内操作工具、迭代结果、跨环境推进任务。

对 Agent 工程师来说，这篇文章的价值在于它给出了几个很硬的采用信号：人们不只让 Agent 写小函数，而是开始把超过 30 分钟、1 小时、8 小时的人类工作交给 Agent；非开发者采用增长更快；企业内部的 AI 使用重心从 Chatbot 迁移到 Agent。

## 核心内容

- OpenAI 把 Agentic AI 描述为把知识工作的单位从单次交互改为 delegated long-horizon tasks。
- 2025 年 8 月以前，OpenAI 员工 Codex token 占比还低于 10%；到 2026 年，Codex 在 OpenAI 内部成为跨部门主要 AI 工作工具。
- 到 2026 年 5 月，抽样个人用户里 80.6% 至少发起过一次估计超过 30 分钟人类工作的 Codex 请求，70.2% 发起过超过 1 小时的请求，25.6% 发起过超过 8 小时的请求。
- OpenAI 内部平均员工 85% 以上的 output tokens 来自 Codex；按全公司 weekly output tokens 看，Codex 占比达到 99.8%。
- 非开发者采用增长更快：自 2025 年 8 月以来，个人用户里的非开发者增长 137 倍，组织用户里的非开发者增长 189 倍。
- 财务、运营、产品、市场等非工程部门也在用 Codex 做自动化、数据转换、debug、结构化分析和内部工具。

## 深度精读

这篇文章最重要的一句话可以换成工程语言：**Agent 改变的是任务粒度**。

过去很多 AI 产品优化的是“这一轮回答更好”。Agent 产品优化的是“这个任务能不能被交出去”。任务一旦被交出去，就会出现一组新问题：它是否有明确完成标准，是否能跨多个工具工作，失败时谁接手，运行 60 分钟后状态在哪里，多个 Agent 并行时怎么汇总。

OpenAI 的数据说明，Codex 已经从开发者工具变成更广义的“可委派执行环境”。非开发者使用增长很快，不代表所有人都变成程序员，而是说明 Agent 正在把技术执行变成一种可调用能力。财务团队可以让 Codex 做数据清洗和模型更新，Recruiting 可以让 Codex 生成流程工具，Legal 可以让 Codex 做结构化分析。

这对你的站点有两个启发：

1. **Agent 工程师不能只懂模型 API**。你要懂任务分解、运行时、工具权限、评估、成本和组织采用。
2. **Agent 产品的核心指标会变**。不是每轮满意度，而是任务 horizon、可委派比例、人工接管率、验证通过率、跨部门采用率。

## 学习时重点看什么

- 看 `task horizon`：Agent 请求被估计为超过 30 分钟、1 小时、8 小时人类工作，这比“调用次数”更能说明价值。
- 看 `non-developer adoption`：Agent 能否跨出工程部门，是产品成熟度的重要信号。
- 看 `parallel agent work`：重度用户每天产生大量 agent turns，说明并行委派已成为工作方式。
- 看 `output token share`：从 Chatbot 转向 Codex，不是口号，是内部 token 结构变化。

## 工程启发

如果把这篇文章翻译成 Agent 平台指标，可以得到一张表：

| 指标 | 为什么重要 |
|---|---|
| task horizon | 衡量 Agent 是否承担长周期任务，而不是短问答 |
| handoff rate | 任务交出去后有多少需要人中途接管 |
| verification pass rate | Agent 产物能否通过测试、审查或业务规则 |
| cross-functional usage | 非工程团队是否也能把任务交给 Agent |
| parallelism | 用户是否同时委派多个 Agent 工作 |
| cost per completed task | 不是每 token 成本，而是每个完成任务的总成本 |

这也解释了为什么 [Loop Engineering](../../engineering/loop-engineering)、[Agent Runtime](../../engineering/agent-runtime)、[评估体系](../../engineering/evaluation) 会越来越重要。单次模型调用越来越像底层原语，真正的产品能力在“任务能否被稳定完成”。

## 和本站章节的关系

- [Agent Runtime](../../engineering/agent-runtime)：OpenAI 的数据说明 Agent 已经成为组织里的执行系统。
- [Loop Engineering](../../engineering/loop-engineering)：长周期任务需要跨运行的调度、验证和接力。
- [成本优化](../../engineering/cost-optimization)：任务价值要按 completed task 计算，而不是只看 token。
- [垂直领域 Agent](../../vertical/)：非开发者采用意味着 Agent 会进入金融、法律、招聘、运营等具体流程。

## 面试追问

- 如何定义 Agent 产品的 task horizon？
- 为什么非开发者采用是 Agent 成熟度的重要指标？
- 如果一个 Agent 任务运行 2 小时，系统至少要记录哪些状态？
- 为什么“每 token 成本”不是 Agent ROI 的唯一指标？

