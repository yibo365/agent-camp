# Claude Code auto mode：更安全地减少权限确认

- 原文标题：Claude Code auto mode: a safer way to skip permissions
- 原文链接：https://www.anthropic.com/engineering/claude-code-auto-mode
- 发布时间：2026-03-25
- 来源：Anthropic Engineering
- 主题：权限审批疲劳、分类器、prompt injection probe、工具调用安全

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

Claude Code 默认会在运行命令或修改文件前请求用户审批，但实际用户会批准绝大多数提示，久而久之形成审批疲劳。auto mode 试图在“每步都问”和“完全跳过权限”之间找到中间态：让分类器自动放行低风险动作，拦截不符合用户意图的危险动作。

## 核心内容

- 输入层有 prompt-injection probe，用来扫描工具输出、文件内容、网页内容等外部输入。
- 输出层有 transcript classifier，在工具调用执行前判断动作是否危险。
- 分类器故意不看 Claude 自己的推理和工具输出，避免被被污染上下文牵着走。
- 对子 Agent 的 handoff 也要检查：委派前看任务是否越权，返回时看子 Agent 过程中是否被污染。
- deny-and-continue 让被拒绝的动作变成可恢复边界，而不是立刻中断整个任务。

## 工程启发

- 权限提示不是越多越安全，频繁审批会让用户停止认真判断。
- 自动权限系统要同时控制误放行和误拦截，且误拦截要能恢复。
- 子 Agent 是新的安全边界，需要在委派和返回两端做检查。

## 和本站章节的关系

- [Agent 工程化 - 安全](../../engineering/security)
- [工具调用错误处理](../../tools/error-handling)
- [提示词注入攻防](../../prompt/injection)
- [Claude Code 架构剖析](../../source/claude-code)

## 面试追问

- 为什么审批疲劳会降低安全性？
- transcript classifier 为什么不能只看最终工具参数？
- 子 Agent handoff 会带来什么额外风险？
