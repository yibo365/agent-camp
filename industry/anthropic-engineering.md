# Anthropic Engineering 中文导读

来源：[Engineering at Anthropic](https://www.anthropic.com/engineering)。整理日期：2026-06-01。

> 本页保留原站入口的核心格式信息：标题、日期、原文链接，并补充中文导读。完整正文、图片和代码请阅读原文。

## Featured

### Claude 跨产品隔离与约束

- 原文：[How we contain Claude across products](https://www.anthropic.com/engineering/how-we-contain-claude)
- 日期：2026-05-25
- 主题：Agent containment、沙箱、权限边界、产品安全
- 中文导读：文章把 claude.ai、Claude Code、Claude Cowork 的 Agent 风险拆成用户误用、模型误行为和外部攻击三类，再从运行环境、模型层和外部内容三个防线解释如何限制 blast radius。

## 2026

### Claude Code 质量报告更新：三类回归与修复

- 原文：[An update on recent Claude Code quality reports](https://www.anthropic.com/engineering/april-23-postmortem)
- 日期：2026-04-23
- 主题：质量回归、reasoning effort、上下文缓存、system prompt
- 中文导读：Anthropic 复盘 Claude Code 近期质量反馈，定位到默认推理强度、旧 thinking 清理逻辑和减少冗长输出的 system prompt 改动三类问题。

### 扩展托管 Agent：把“大脑”和“手”解耦

- 原文：[Scaling Managed Agents: Decoupling the brain from the hands](https://www.anthropic.com/engineering/managed-agents)
- 日期：2026-04-08
- 主题：Managed Agents、session log、harness、sandbox
- 中文导读：文章把长周期 Agent 拆成 session、harness 和 sandbox 三个可替换接口，解释为什么不能把所有组件塞进同一个“宠物容器”里。

### Claude Code auto mode：更安全地减少权限确认

- 原文：[How we built Claude Code auto mode: a safer way to skip permissions](https://www.anthropic.com/engineering/claude-code-auto-mode)
- 日期：2026-03-25
- 主题：权限审批疲劳、分类器、prompt injection probe、工具调用安全
- 中文导读：Claude Code 用户会批准绝大多数权限弹窗，auto mode 用输入层注入检测和输出层 transcript classifier 自动放行低风险行为、拦截越界操作。

### 长周期应用开发的 Harness 设计

- 原文：[Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- 日期：2026-03-24
- 主题：长周期任务、应用开发、Agent harness
- 中文导读：文章聚焦让 Agent 长时间开发应用时需要怎样的 harness：如何给任务提供稳定接口、可恢复上下文和能被验证的工程环境。

### Claude Opus 4.6 BrowseComp 表现中的评测感知

- 原文：[Eval awareness in Claude Opus 4.6's BrowseComp performance](https://www.anthropic.com/engineering/eval-awareness-browsecomp)
- 日期：2026-03-06
- 主题：评测感知、BrowseComp、模型行为解释
- 中文导读：文章讨论模型在评测环境中识别到“自己正在被评测”时可能改变行为的问题，是理解 benchmark 可信度和 agent eval 设计的重要材料。

### 量化 Agent 编程评测中的基础设施噪声

- 原文：[Quantifying infrastructure noise in agentic coding evals](https://www.anthropic.com/engineering/infrastructure-noise)
- 日期：2026-02-05
- 主题：Coding eval、基础设施噪声、可重复性
- 中文导读：文章关注评测结果中的非模型因素：依赖安装、网络、测试环境和执行基础设施都可能让 coding agent 的分数产生噪声。

### 用一组并行 Claude 构建 C 编译器

- 原文：[Building a C compiler with a team of parallel Claudes](https://www.anthropic.com/engineering/building-c-compiler)
- 日期：2026-02-05
- 主题：并行 Agent、编译器、任务分解
- 中文导读：Anthropic 用多个 Claude 并行协作构建 C 编译器，适合观察多 Agent 在复杂软件项目中的拆分、协调和验证方式。

### 设计抗 AI 的技术评测

- 原文：[Designing AI-resistant technical evaluations](https://www.anthropic.com/engineering/AI-resistant-technical-evaluations)
- 日期：2026-01-21
- 主题：技术面试、AI-resistant eval、评测泄漏
- 中文导读：文章讨论当候选人可以使用 AI 时，传统技术评测如何失效，以及怎样设计更能测出真实工程能力的题目。

### 揭开 AI Agent 评测的面纱

- 原文：[Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- 日期：2026-01-09
- 主题：Agent eval、成功标准、任务设计
- 中文导读：这是一篇 Agent 评测入门材料，适合和本站的评估体系章节一起读：如何定义任务、评分、失败分析和迭代闭环。

## 2025

### 长周期 Agent 的有效 Harness

- 原文：[Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- 日期：2025-11-26
- 主题：长周期 Agent、harness、上下文恢复
- 中文导读：文章总结长时间运行的 Agent 需要哪些外部结构支持，包括任务状态、工具接口、恢复策略和验证反馈。

### Claude Developer Platform 的高级工具使用

- 原文：[Introducing advanced tool use on the Claude Developer Platform](https://www.anthropic.com/engineering/advanced-tool-use)
- 日期：2025-11-24
- 主题：工具调用、Claude Platform、开发者能力
- 中文导读：文章介绍 Claude 平台上的高级工具使用能力，适合和 function calling、MCP、工具 schema 设计一起对照阅读。

### 用 MCP 执行代码：构建更高效的 Agent

- 原文：[Code execution with MCP: Building more efficient agents](https://www.anthropic.com/engineering/code-execution-with-mcp)
- 日期：2025-11-04
- 主题：MCP、代码执行、Agent 效率
- 中文导读：文章讲通过 MCP 接入代码执行能力，让 Agent 在需要计算、转换、验证时不必把所有中间数据塞回上下文。

### 通过沙箱让 Claude Code 更安全更自主

- 原文：[Beyond permission prompts: making Claude Code more secure and autonomous](https://www.anthropic.com/engineering/claude-code-sandboxing)
- 日期：2025-10-20
- 主题：Claude Code、沙箱、权限提示、安全自主性
- 中文导读：文章从“每步都问用户”转向“把危险操作限制在环境边界内”，是理解 Claude Code 安全模型的关键工程复盘。

### 用 Agent Skills 装备真实世界 Agent

- 原文：[Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- 日期：2025-10-16
- 主题：Agent Skills、可复用能力、任务封装
- 中文导读：文章解释如何把稳定的过程、工具和领域知识封装成 Skills，让 Agent 面对真实任务时能按需加载能力。

### AI Agent 的有效上下文工程

- 原文：[Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- 日期：2025-09-29
- 主题：上下文工程、prompt、工具、示例、长周期任务
- 中文导读：这篇是上下文工程的系统性文章，核心观点是把 context 当作有限资源管理：系统提示词、工具、示例、检索和历史都要围绕高信噪比组织。

### 三个近期问题复盘

- 原文：[A postmortem of three recent issues](https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues)
- 日期：2025-09-17
- 主题：事故复盘、可靠性、产品工程
- 中文导读：文章复盘 Anthropic 三个近期问题，适合从工程可靠性角度看 AI 产品上线后的监控、响应和纠错机制。

### 用 Agent 编写有效的 Agent 工具

- 原文：[Writing effective tools for agents — with agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
- 日期：2025-09-11
- 主题：工具设计、Agent 自举、tool ergonomics
- 中文导读：文章关注工具不是给人看的 API，而是给模型使用的接口；好的工具应当边界清晰、反馈明确、能减少上下文浪费。

### Claude Desktop Extensions：一键安装 MCP Server

- 原文：[Desktop Extensions: One-click MCP server installation for Claude Desktop](https://www.anthropic.com/engineering/desktop-extensions)
- 日期：2025-06-26
- 主题：Claude Desktop、MCP Server、扩展分发
- 中文导读：文章介绍 Desktop Extensions 如何把 MCP server 的安装、配置和分发变成更低门槛的一键流程。

### Anthropic 如何构建多 Agent 研究系统

- 原文：[How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- 日期：2025-06-13
- 主题：多 Agent、研究系统、任务委派
- 中文导读：文章展示一个多 Agent 研究系统如何拆分查询、分派子任务、合并证据，适合和本站多 Agent 协作章节一起读。

### Claude Code：Agent 编程最佳实践

- 原文：[Claude Code: Best practices for agentic coding](https://www.anthropic.com/engineering/claude-code-best-practices)
- 日期：2025-04-18
- 主题：Claude Code、Agentic coding、开发流程
- 中文导读：这篇偏实践指南，覆盖如何给 Claude Code 提供上下文、拆任务、检查结果，以及怎样把 Agent 融入日常开发流。

### “think” 工具：让 Claude 在复杂工具使用中停下来思考

- 原文：[The "think" tool: Enabling Claude to stop and think in complex tool use situations](https://www.anthropic.com/engineering/claude-think-tool)
- 日期：2025-03-20
- 主题：think tool、复杂工具使用、推理控制
- 中文导读：文章介绍一个显式“思考”工具，让 Claude 在复杂工具调用场景中先整理计划和约束，再继续行动。

### 用 Claude 3.5 Sonnet 提升 SWE-bench Verified 表现

- 原文：[Raising the bar on SWE-bench Verified with Claude 3.5 Sonnet](https://www.anthropic.com/engineering/swe-bench-sonnet)
- 日期：2025-01-06
- 主题：SWE-bench、Coding Agent、评测表现
- 中文导读：文章解释 Claude 3.5 Sonnet 在 SWE-bench Verified 上的工程改进与评测结果，适合理解 coding benchmark 的价值和局限。

## 2024

### 构建高效 Agent

- 原文：[Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- 日期：2024-12-19
- 主题：Workflow vs Agent、模式、编排、工具使用
- 中文导读：这是 Anthropic 最经典的 Agent 工程文章之一，强调优先使用简单可控的 workflow，只有在模型需要自主决策时才升级为 agent。

### 引入 Contextual Retrieval

- 原文：[Introducing Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)
- 日期：2024-09-19
- 主题：RAG、上下文增强、检索质量
- 中文导读：文章提出在 chunk 入库前补充文档级上下文，缓解切分后语义丢失的问题，是理解现代 RAG 工程优化的关键材料。

## 建议阅读顺序

1. 入门 Agent 设计：Building effective agents、Effective context engineering。
2. 做 Coding Agent：Claude Code best practices、effective harnesses、managed agents。
3. 做安全与权限：sandboxing、auto mode、containment。
4. 做评测与可靠性：demystifying evals、infrastructure noise、AI-resistant evaluations、postmortems。
