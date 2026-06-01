# 扩展托管 Agent：把“大脑”和“手”解耦

- 原文标题：Scaling Managed Agents: Decoupling the brain from the hands
- 原文链接：https://www.anthropic.com/engineering/managed-agents
- 发布时间：2026-04-08
- 来源：Anthropic Engineering
- 主题：Managed Agents、session log、harness、sandbox

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

长周期 Agent 如果把模型、工具、状态、文件系统和执行环境都塞在一个容器里，短期能跑，长期会难以扩展、恢复和审计。文章提出把“脑”和“手”解耦：模型负责决策，执行环境负责动作，session log 负责状态和追溯。

## 核心内容

- Managed Agents 需要把 session、harness 和 sandbox 作为独立接口设计。
- session log 是长周期 Agent 的事实来源，记录用户意图、工具调用和中间结果。
- harness 负责把模型决策转成工具动作，并把结果回传。
- sandbox 负责隔离执行环境，限制越权和资源滥用。

## 工程启发

- 不要把 Agent 设计成不可迁移的“宠物容器”，要让状态可恢复、环境可替换。
- 长任务必须支持暂停、恢复、审计和失败重放。
- 分层接口比单体 Agent 更适合规模化运营。

## 和本站章节的关系

- [Agent 运行循环](../../agent/agent-loop)
- [工具沙箱与权限](../../tools/sandbox)
- [Agent 工程化 - 可观测性](../../engineering/observability)
- [流程编排 Workflow](../../workflow/)

## 面试追问

- session log 为什么是 Managed Agent 的核心？
- harness 和 sandbox 的职责边界是什么？
- 如何让一个长周期 Agent 支持恢复和重放？
