# 通过沙箱让 Claude Code 更安全更自主

- 原文标题：Beyond permission prompts: making Claude Code more secure and autonomous
- 原文链接：https://www.anthropic.com/engineering/claude-code-sandboxing
- 发布时间：2025-10-20
- 来源：Anthropic Engineering
- 主题：Claude Code、沙箱、权限提示、安全自主性

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

Claude Code 要变得更自主，就不能每个命令都要求用户确认；但越自主，越需要硬边界。文章讨论如何从权限提示转向沙箱，让 Agent 能做更多事，同时限制它不能造成不可接受的损害。

## 核心内容

- 权限提示适合少量高风险动作，不适合作为所有安全的基础。
- 沙箱把安全从“用户判断每一步”转为“系统限制可做范围”。
- Coding Agent 的沙箱要覆盖文件系统、网络、命令执行和凭据访问。
- 安全自主性来自低风险操作的自动化与高风险操作的边界控制。

## 工程启发

- 沙箱能提高可用性，因为它减少了无意义审批。
- Agent 安全要优先保护凭据、生产环境和不可逆操作。
- 自动化越强，审计日志越重要。

## 和本站章节的关系

- [工具沙箱与权限](../../tools/sandbox)
- [Agent 工程化 - 安全](../../engineering/security)
- [Claude Code 架构剖析](../../source/claude-code)
- [Coding Agent](../../vertical/coding-agent)

## 面试追问

- 为什么沙箱比权限弹窗更适合高频开发动作？
- Coding Agent 的沙箱应该默认禁止什么？
- 如何处理必须访问外部网络的任务？
