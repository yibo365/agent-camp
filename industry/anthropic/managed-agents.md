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

## 深度精读

这篇文章的关键概念是把 Agent 拆成“脑”和“手”。“脑”是模型推理与计划，“手”是工具执行与环境操作。早期 demo 往往把两者塞进一个进程或容器里，短期方便，但一旦任务运行很久，就会出现恢复困难、状态不可追踪、资源无法隔离、版本难以升级等问题。

session log 是整套架构的中心。它不是普通聊天记录，而是可恢复、可审计、可重放的事件流：用户给了什么目标，Agent 观察到了什么，调用了哪些工具，工具返回什么，哪些动作被批准或拒绝。只要 session log 完整，模型进程可以重启，执行环境可以替换，任务仍然能继续。

harness 和 sandbox 的分离也很重要。harness 负责把模型意图翻译成系统动作，它关心协议、工具、状态和错误恢复；sandbox 负责限制动作的影响范围，它关心文件、网络、权限和资源。把这两层拆开，Agent 平台才有可能同时支持 Claude Code、研究 Agent、办公 Agent 等不同产品。

## 学习时重点看什么

- 长周期 Agent 的状态应该存在事件日志里，而不是只存在模型上下文里。
- 可恢复性、可替换性和可审计性是 Managed Agent 的核心能力。
- “脑”和“手”解耦后，平台可以更容易扩展不同 Agent 产品。

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
