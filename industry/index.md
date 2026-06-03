# 一线工程分享

OpenAI 和 Anthropic 的工程博客，是观察 Agent 产品如何真实落地的高信噪比窗口。本栏目把两家的公开工程分享整理成站内中文精读页，保留原文标题、发布时间、来源链接和主题脉络，重点提炼工程问题、架构取舍、上线经验和面试可追问点。

> 说明：这里是中文学习笔记，不是逐字全文转载。完整正文、图片和代码请回到原文阅读。

## OpenAI Engineering

- [用 Codex 构建可自我改进的税务 Agent](./openai/building-self-improving-tax-agents-with-codex)
- [为 Windows 版 Codex 构建安全有效的沙箱](./openai/building-codex-windows-sandbox)
- [加速大规模 AI 训练的超算网络](./openai/mrc-supercomputer-networking)
- [OpenAI 如何大规模交付低延迟语音 AI](./openai/delivering-low-latency-voice-ai-at-scale)
- [Codex 编排开源规范：Symphony](./openai/open-source-codex-orchestration-symphony)
- [使用 Responses API 的 WebSocket 加速 Agent 工作流](./openai/speeding-up-agentic-workflows-with-websockets)
- [从模型到 Agent：为 Responses API 配备计算机环境](./openai/equip-responses-api-computer-environment)
- [超越限流：扩展 Codex 与 Sora 的访问机制](./openai/beyond-rate-limits)
- [Harness 工程：在 Agent-first 世界使用 Codex](./openai/harness-engineering)
- [解锁 Codex Harness：App Server 架构](./openai/unlocking-the-codex-harness)

## Anthropic Engineering

- [Claude 跨产品隔离与约束](./anthropic/how-we-contain-claude)
- [Claude Code 质量报告更新](./anthropic/april-23-postmortem)
- [扩展托管 Agent：把“大脑”和“手”解耦](./anthropic/managed-agents)
- [Claude Code auto mode：更安全地减少权限确认](./anthropic/claude-code-auto-mode)
- [长周期应用开发的 Harness 设计](./anthropic/harness-design-long-running-apps)
- [Claude Opus 4.6 BrowseComp 表现中的评测感知](./anthropic/eval-awareness-browsecomp)
- [量化 Agent 编程评测中的基础设施噪声](./anthropic/infrastructure-noise)
- [用一组并行 Claude 构建 C 编译器](./anthropic/building-c-compiler)
- [设计抗 AI 的技术评测](./anthropic/ai-resistant-technical-evaluations)
- [揭开 AI Agent 评测的面纱](./anthropic/demystifying-evals-for-ai-agents)
- [长周期 Agent 的有效 Harness](./anthropic/effective-harnesses-for-long-running-agents)
- [Claude Developer Platform 的高级工具使用](./anthropic/advanced-tool-use)
- [用 MCP 执行代码：构建更高效的 Agent](./anthropic/code-execution-with-mcp)
- [通过沙箱让 Claude Code 更安全更自主](./anthropic/claude-code-sandboxing)
- [用 Agent Skills 装备真实世界 Agent](./anthropic/equipping-agents-for-the-real-world-with-agent-skills)
- [AI Agent 的有效上下文工程](./anthropic/effective-context-engineering-for-ai-agents)
- [三个近期问题复盘](./anthropic/a-postmortem-of-three-recent-issues)
- [用 Agent 编写有效的 Agent 工具](./anthropic/writing-tools-for-agents)
- [Claude Desktop Extensions：一键安装 MCP Server](./anthropic/desktop-extensions)
- [Anthropic 如何构建多 Agent 研究系统](./anthropic/multi-agent-research-system)
- [Claude Code：Agent 编程最佳实践](./anthropic/claude-code-best-practices)
- [“think” 工具：让 Claude 在复杂工具使用中停下来思考](./anthropic/claude-think-tool)
- [用 Claude 3.5 Sonnet 提升 SWE-bench Verified 表现](./anthropic/swe-bench-sonnet)
- [构建高效 Agent](./anthropic/building-effective-agents)
- [Contextual Retrieval](./anthropic/contextual-retrieval)

## 和本站章节的关系

- [Agent 工程化](../engineering/) 讲评估、观测、成本、安全这些通用工程问题。
- [Agent 源码解析](../source/) 讲 Claude Code、Codex CLI、Cline、OpenHands 等系统的实现思路。
- [上下文工程](../context/) 和 [工具调用](../tools/) 是理解这些文章的底层知识。
