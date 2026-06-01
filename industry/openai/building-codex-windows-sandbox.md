# 为 Windows 版 Codex 构建安全有效的沙箱

- 原文标题：Building a safe, effective sandbox to enable Codex on Windows
- 原文链接：https://openai.com/index/building-codex-windows-sandbox/
- 发布时间：2026-05-13
- 来源：OpenAI Engineering / Security
- 主题：Windows 沙箱、本地 Coding Agent、权限边界

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

本地 Coding Agent 需要执行 shell 命令、读取文件、运行测试，但无限制执行又会把用户机器暴露给误操作和攻击。Windows 版 Codex 的问题在于：如果没有沙箱，用户只能在频繁审批和完全放权之间二选一。

## 核心内容

- 安全设计要兼顾可用性：只靠人工审批会造成疲劳，只靠 full access 又缺少边界。
- Windows 的权限模型和类 Unix 系统差异明显，不能简单复用现有沙箱思路。
- 初版“非提升权限”方案能隔离部分行为，但可用性和覆盖范围不够。
- 重新设计后的 elevated sandbox 把设置逻辑和 Codex harness 分离，让主进程保持普通权限，同时用专门组件完成 Windows 侧隔离。

## 工程启发

- 沙箱不是“禁用一切危险能力”，而是让常见开发任务低摩擦运行，把危险行为挡在边界外。
- Coding Agent 的权限模型应当按操作类型分层：读、写、执行、联网、跨目录访问需要不同策略。
- 本地 Agent 安全不能只依赖模型遵守指令，必须有操作系统级边界。

## 和本站章节的关系

- [工具沙箱与权限](../../tools/sandbox)
- [Agent 工程化 - 安全](../../engineering/security)
- [提示词注入攻防](../../prompt/injection)
- [Codex CLI 源码](../../source/codex-cli)

## 面试追问

- 为什么 Coding Agent 的“每次都问用户”不是长期可行方案？
- 沙箱、权限提示和审计日志分别解决哪一类风险？
- Windows 沙箱和 Linux 容器的工程约束有什么不同？
