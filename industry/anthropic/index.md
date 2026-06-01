# Anthropic Engineering

来源：[Engineering at Anthropic](https://www.anthropic.com/engineering)。整理日期：2026-06-01。

这一组收录 Anthropic Engineering 入口当前可见的工程文章。每篇都整理成站内中文深度精读页，保留原文链接、发布时间和主题脉络，重点提炼 Claude Code、Agent harness、上下文工程、工具使用、评测、安全和 MCP 的工程取舍。

> 说明：本站页面面向国内学习者做了较完整的中文讲解和结构化重述，但不是逐字全文翻译。需要核对原始表述、图片和代码时，请回到原文阅读。

## 文章列表

- [Claude 跨产品隔离与约束](./how-we-contain-claude)
- [Claude Code 质量报告更新](./april-23-postmortem)
- [扩展托管 Agent：把“大脑”和“手”解耦](./managed-agents)
- [Claude Code auto mode：更安全地减少权限确认](./claude-code-auto-mode)
- [长周期应用开发的 Harness 设计](./harness-design-long-running-apps)
- [Claude Opus 4.6 BrowseComp 表现中的评测感知](./eval-awareness-browsecomp)
- [量化 Agent 编程评测中的基础设施噪声](./infrastructure-noise)
- [用一组并行 Claude 构建 C 编译器](./building-c-compiler)
- [设计抗 AI 的技术评测](./ai-resistant-technical-evaluations)
- [揭开 AI Agent 评测的面纱](./demystifying-evals-for-ai-agents)
- [长周期 Agent 的有效 Harness](./effective-harnesses-for-long-running-agents)
- [Claude Developer Platform 的高级工具使用](./advanced-tool-use)
- [用 MCP 执行代码：构建更高效的 Agent](./code-execution-with-mcp)
- [通过沙箱让 Claude Code 更安全更自主](./claude-code-sandboxing)
- [用 Agent Skills 装备真实世界 Agent](./equipping-agents-for-the-real-world-with-agent-skills)
- [AI Agent 的有效上下文工程](./effective-context-engineering-for-ai-agents)
- [三个近期问题复盘](./a-postmortem-of-three-recent-issues)
- [用 Agent 编写有效的 Agent 工具](./writing-tools-for-agents)
- [Claude Desktop Extensions：一键安装 MCP Server](./desktop-extensions)
- [Anthropic 如何构建多 Agent 研究系统](./multi-agent-research-system)
- [Claude Code：Agent 编程最佳实践](./claude-code-best-practices)
- [“think” 工具：让 Claude 在复杂工具使用中停下来思考](./claude-think-tool)
- [用 Claude 3.5 Sonnet 提升 SWE-bench Verified 表现](./swe-bench-sonnet)
- [构建高效 Agent](./building-effective-agents)
- [Contextual Retrieval](./contextual-retrieval)

## 阅读顺序

1. 入门 Agent 设计：先读 [构建高效 Agent](./building-effective-agents)、[有效上下文工程](./effective-context-engineering-for-ai-agents)。
2. 做 Coding Agent：读 [Claude Code 最佳实践](./claude-code-best-practices)、[长周期 Harness](./effective-harnesses-for-long-running-agents)、[Managed Agents](./managed-agents)。
3. 做安全与权限：读 [沙箱](./claude-code-sandboxing)、[auto mode](./claude-code-auto-mode)、[containment](./how-we-contain-claude)。
4. 做评测与可靠性：读 [Agent evals](./demystifying-evals-for-ai-agents)、[基础设施噪声](./infrastructure-noise)、[AI-resistant evaluations](./ai-resistant-technical-evaluations)、[事故复盘](./a-postmortem-of-three-recent-issues)。
