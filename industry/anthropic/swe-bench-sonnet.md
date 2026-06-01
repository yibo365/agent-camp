# 用 Claude 3.5 Sonnet 提升 SWE-bench Verified 表现

- 原文标题：Raising the bar on SWE-bench Verified with Claude 3.5 Sonnet
- 原文链接：https://www.anthropic.com/engineering/swe-bench-sonnet
- 发布时间：2025-01-06
- 来源：Anthropic Engineering
- 主题：SWE-bench、Coding Agent、评测表现

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

SWE-bench Verified 用真实 GitHub issue 衡量模型修复软件问题的能力。文章介绍 Claude 3.5 Sonnet 在该评测上的表现和工程意义，帮助理解 coding benchmark 如何推动 Agent 能力进步。

## 核心内容

- SWE-bench 比简单代码题更接近真实开发：需要理解仓库、定位问题、修改代码和通过测试。
- Verified 子集提升了任务质量和评测可信度。
- 模型能力只是其中一部分，Agent harness、工具、搜索和测试执行也影响成绩。
- 高分不等于生产可用，还要看可靠性、成本和失败模式。

## 工程启发

- Coding Agent 评测应尽量使用真实任务和真实测试。
- benchmark 结果要结合任务轨迹分析，找出失败阶段。
- 生产落地需要从 benchmark 迁移到内部任务集。

## 和本站章节的关系

- [评估体系](../../engineering/evaluation)
- [Coding Agent](../../vertical/coding-agent)
- [Claude Code 架构剖析](../../source/claude-code)

## 面试追问

- SWE-bench Verified 为什么比普通代码题更有价值？
- Coding Agent 的 benchmark 成绩受哪些非模型因素影响？
- 如何把 SWE-bench 思路迁移到公司内部代码库？
