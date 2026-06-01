# 用 Agent Skills 装备真实世界 Agent

- 原文标题：Equipping agents for the real world with Agent Skills
- 原文链接：https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- 发布时间：2025-10-16
- 来源：Anthropic Engineering
- 主题：Agent Skills、可复用能力、任务封装

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

真实任务包含大量领域流程：如何读某类文件、如何调用内部工具、如何按公司规范生成报告。每次都把这些规则塞进 prompt 会浪费上下文，也难维护。Agent Skills 把稳定能力封装成可加载模块。

## 核心内容

- Skill 是给 Agent 使用的能力包，包含说明、流程、工具和资源。
- Skills 让 Agent 在需要时加载相关知识，而不是常驻所有上下文。
- 好的 Skill 应该有明确触发条件、步骤、输入输出和失败处理。
- Skills 把组织经验从散乱 prompt 变成可复用工程资产。

## 工程启发

- 当某类任务重复出现时，应考虑沉淀成 Skill，而不是复制 prompt。
- Skill 设计要面向模型阅读，保持短、准、可执行。
- Skill 也是上下文工程的一部分：按需加载比一次塞满更稳。

## 和本站章节的关系

- [上下文工程](../../context/)
- [提示词模板工程化](../../prompt/templates)
- [自定义工具开发](../../tools/custom-tools)
- [Agent 运行循环](../../agent/agent-loop)

## 面试追问

- Skill 和工具有什么区别？
- 为什么按需加载能力比长 system prompt 更好？
- 一个好的 Agent Skill 应该包含哪些内容？
