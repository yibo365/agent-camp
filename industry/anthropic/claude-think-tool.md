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
