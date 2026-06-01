# Harness 工程：在 Agent-first 世界使用 Codex

- 原文标题：Harness engineering: leveraging Codex in an agent-first world
- 原文链接：https://openai.com/index/harness-engineering/
- 发布时间：2026-02-11
- 来源：OpenAI Engineering
- 主题：Codex、Harness、Agent-first 工程、反馈循环

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

文章复盘一个极端实验：团队约束自己不手写产品代码，而是让 Codex 完成应用逻辑、测试、CI、文档和工具。真正的问题不是“AI 能不能写代码”，而是工程团队如何设计环境，让 Agent 能稳定地产出可验证的软件。

## 核心内容

- Agent-first 工程里，人类从“直接写代码”转向“设计环境、表达意图、构建反馈循环”。
- 可靠输出依赖 repo 结构、测试、文档、CI、任务描述和错误反馈。
- Harness 是 Codex 工作的外骨骼：它让模型知道如何观察、修改和验证系统。
- 越大的代码生成比例，越需要更强的验证和回滚机制。

## 工程启发

- 想提高 Coding Agent 成功率，先优化仓库可读性、测试速度和任务规格。
- Agent-friendly repo 应该有清晰边界、可运行测试、稳定脚本和明确贡献约定。
- 工程师不会消失，但工作重心会转向系统设计、评审和反馈工程。

## 和本站章节的关系

- [Coding Agent](../../vertical/coding-agent)
- [Codex CLI 源码](../../source/codex-cli)
- [Agent 工程化 - 评估体系](../../engineering/evaluation)
- [提示词模板工程化](../../prompt/templates)

## 面试追问

- 什么是 harness？它和 prompt 的区别是什么？
- 为什么测试质量决定 Coding Agent 的上限？
- Agent-first 团队里工程师最重要的产出是什么？
