# “think” 工具：让 Claude 在复杂工具使用中停下来思考

- 原文标题：The "think" tool: Enabling Claude to stop and think in complex tool use situations
- 原文链接：https://www.anthropic.com/engineering/claude-think-tool
- 发布时间：2025-03-20
- 来源：Anthropic Engineering
- 主题：think tool、复杂工具使用、推理控制

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

复杂工具使用场景中，模型可能急着行动，导致跳过约束检查或忘记前一步结果。“think” 工具提供一个显式停顿点，让 Claude 在继续调用外部工具前整理计划、状态和风险。

## 核心内容

- think tool 不是给用户看的答案，而是给 Agent 自己的工作记忆。
- 它适合在多步工具调用、复杂约束和高风险动作前使用。
- 显式思考可以帮助模型对齐任务目标、检查已知事实和规划下一步。
- 工具化思考比单纯 prompt “think step by step” 更容易被系统控制和观测。

## 深度精读

这篇文章讲的不是让模型“多想一点”这么简单，而是把思考变成 Agent loop 中的一个可控动作。复杂工具任务里，模型可能连续调用工具，越跑越远；think tool 给它一个中间停顿点，用来整理已知信息、检查约束、决定下一步。

think tool 和普通 CoT prompt 的区别在于系统可见性。普通“step by step”混在输出里，不容易控制什么时候发生，也不一定适合展示给用户；think tool 是一个明确工具调用，可以被记录、限制、评估，甚至只在特定场景启用。

在生产 Agent 里，这类“内部工作台”很重要。模型不一定要把所有推理展示给用户，但系统需要知道它在关键节点是否做了计划、是否检查了风险、是否总结了工具结果。think tool 可以作为复杂动作前的软 checkpoint。

## 学习时重点看什么

- think tool 是 Agent loop 的一个动作，不是用户答案。
- 它适合复杂、多步、高风险工具调用前后。
- 工具化思考便于系统观测和策略控制。

## 工程启发

- Agent 不一定每一步都要立刻行动，有时需要显式反思节点。
- think tool 可作为复杂工作流中的 checkpoint。
- 生产系统要区分内部推理、工具日志和用户可见输出。

## 和本站章节的关系

- [思维链 CoT](../../prompt/cot)
- [Agent 运行循环](../../agent/agent-loop)
- [工具调用错误处理](../../tools/error-handling)
- [自我反思](../../agent/reflexion)

## 面试追问

- think tool 和普通 CoT prompt 有什么区别？
- 什么时候应该让 Agent 停下来思考？
- 内部思考内容应该如何记录和展示？
