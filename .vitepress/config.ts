import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'AIGC Camp',
  description: 'AI Agent 学习与面试指南',
  lang: 'zh-CN',
  cleanUrls: true,
  lastUpdated: true,

  markdown: {
    config(md) {
      const defaultFence = md.renderer.rules.fence

      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        const info = token.info.trim()

        if (info === 'mermaid' || info.startsWith('mermaid ')) {
          return `<MermaidBlock code="${encodeURIComponent(token.content)}"></MermaidBlock>`
        }

        return defaultFence
          ? defaultFence(tokens, idx, options, env, self)
          : self.renderToken(tokens, idx, options)
      }
    },
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#3c8772' }],
  ],

  themeConfig: {
    siteTitle: 'Agent Camp',
    logo: { src: '/logo.svg', alt: 'AIGC Camp' },
    outline: { level: [2, 3], label: '本页大纲' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdatedText: '最后更新',
    darkModeSwitchLabel: '主题',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部',

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
          modal: {
            noResultsText: '无相关结果',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭',
            },
          },
        },
      },
    },

    nav: [
      { text: '首页', link: '/' },
      {
        text: '基础知识',
        items: [
          { text: '大模型基础 LLM', link: '/llm/' },
          { text: '提示词工程 Prompt', link: '/prompt/' },
          { text: '上下文工程 Context', link: '/context/' },
          { text: '工具调用 Tool Use', link: '/tools/' },
        ],
      },
      {
        text: 'RAG 与 Agent',
        items: [
          { text: 'RAG 检索增强', link: '/rag/' },
          { text: 'Agent 核心理论', link: '/agent/' },
          { text: '流程编排 Workflow', link: '/workflow/' },
          { text: '多 Agent 协作 Multi-Agent', link: '/multi-agent/' },
        ],
      },
      {
        text: '框架与源码',
        items: [
          { text: '主流 Agent 框架', link: '/frameworks/' },
          { text: 'Agent 源码解析', link: '/source/' },
        ],
      },
      {
        text: '工程化',
        items: [
          { text: 'Agent 工程化', link: '/engineering/' },
          { text: '一线工程分享', link: '/industry/' },
          { text: '垂直领域 Agent', link: '/vertical/' },
        ],
      },
    ],

    sidebar: {
      '/llm/': [
        {
          text: '大模型基础 LLM',
          items: [
            { text: '概览', link: '/llm/' },
            { text: 'Transformer 架构', link: '/llm/transformer' },
            { text: '分词 Tokenization', link: '/llm/tokenization' },
            { text: '嵌入 Embedding', link: '/llm/embedding' },
            { text: '预训练 / SFT / RLHF / DPO', link: '/llm/training' },
            { text: '推理参数详解', link: '/llm/inference-params' },
            { text: '推理优化（KV Cache / 量化 / FlashAttention）', link: '/llm/inference-optimization' },
            { text: '主流模型对比', link: '/llm/models' },
            { text: '开源 vs 闭源选型', link: '/llm/open-vs-closed' },
          ],
        },
      ],

      '/prompt/': [
        {
          text: '提示词工程 Prompt Engineering',
          items: [
            { text: '概览', link: '/prompt/' },
            { text: '基础原则', link: '/prompt/basics' },
            { text: '少样本学习 Few-shot', link: '/prompt/few-shot' },
            { text: '思维链 CoT / ToT / GoT', link: '/prompt/cot' },
            { text: '自一致性与自我反思 Self-Consistency / Self-Refine', link: '/prompt/self-consistency' },
            { text: 'ReAct 模式', link: '/prompt/react' },
            { text: '系统提示词设计 System Prompt', link: '/prompt/system-prompt' },
            { text: '提示词模板工程化', link: '/prompt/templates' },
            { text: '提示词注入攻防 Prompt Injection', link: '/prompt/injection' },
            { text: '提示词压缩 Prompt Compression', link: '/prompt/compression' },
          ],
        },
      ],

      '/context/': [
        {
          text: '上下文工程 Context Engineering',
          items: [
            { text: '概览', link: '/context/' },
            { text: '上下文窗口与位置偏置 Lost in the Middle', link: '/context/window-bias' },
            { text: '长上下文模型对比', link: '/context/long-context' },
            { text: '上下文压缩与摘要', link: '/context/compression' },
            { text: '记忆系统 Memory', link: '/context/memory' },
            { text: '会话历史管理', link: '/context/history' },
            { text: '上下文缓存 Context Caching', link: '/context/caching' },
            { text: '上下文污染与清理', link: '/context/pollution' },
          ],
        },
      ],

      '/tools/': [
        {
          text: '工具调用 Tool Use & Function Calling',
          items: [
            { text: '概览', link: '/tools/' },
            { text: '函数调用规范 Function Calling', link: '/tools/function-calling' },
            { text: '工具 Schema 设计', link: '/tools/schema-design' },
            { text: '并行工具调用 Parallel Tool Use', link: '/tools/parallel' },
            { text: '错误处理与重试', link: '/tools/error-handling' },
            { text: 'MCP 协议详解 Model Context Protocol', link: '/tools/mcp' },
            { text: 'MCP Server 生产化', link: '/tools/mcp-production' },
            { text: '工具沙箱与权限 Sandbox', link: '/tools/sandbox' },
            { text: '自定义工具开发 Custom Tool', link: '/tools/custom-tools' },
          ],
        },
      ],

      '/rag/': [
        {
          text: 'RAG 检索增强 Retrieval-Augmented Generation',
          items: [
            { text: '概览', link: '/rag/' },
            { text: '朴素 RAG 与瓶颈 Naive RAG', link: '/rag/basics' },
            { text: '文档切分策略 Chunking', link: '/rag/chunking' },
            { text: '嵌入模型选型 Embedding Models', link: '/rag/embedding-models' },
            { text: '向量数据库对比 Vector DB', link: '/rag/vector-db' },
            { text: '混合检索 Hybrid Search（BM25 + Dense）', link: '/rag/hybrid-search' },
            { text: '重排序 Reranking', link: '/rag/reranking' },
            { text: '高级 RAG（HyDE / Step-back / Self-RAG）', link: '/rag/advanced' },
            { text: 'GraphRAG 图增强检索', link: '/rag/graphrag' },
            { text: 'Agentic RAG', link: '/rag/agentic-rag' },
            { text: 'RAG 评估方法 Evaluation', link: '/rag/evaluation' },
          ],
        },
      ],

      '/agent/': [
        {
          text: 'Agent 核心理论',
          items: [
            { text: '概览', link: '/agent/' },
            { text: 'Agent 定义与认知架构', link: '/agent/definition' },
            { text: 'ReAct 模式 Reasoning + Acting', link: '/agent/react-pattern' },
            { text: '先规划后执行 Plan-and-Execute / ReWOO', link: '/agent/plan-execute' },
            { text: '自我反思 Reflexion / Self-Refine', link: '/agent/reflexion' },
            { text: 'Agent 运行循环 Agent Loop', link: '/agent/agent-loop' },
            { text: '规划算法 Planning', link: '/agent/planning' },
            { text: '记忆架构 Memory（MemGPT / Mem0）', link: '/agent/memory-arch' },
            { text: 'Agent Skills 可加载能力', link: '/agent/skills' },
            { text: '自我纠错 Self-Correction', link: '/agent/self-correction' },
          ],
        },
      ],

      '/workflow/': [
        {
          text: '流程编排 Workflow Orchestration',
          items: [
            { text: '概览', link: '/workflow/' },
            { text: 'LangGraph 深度解析', link: '/workflow/langgraph' },
            { text: 'LlamaIndex Workflows', link: '/workflow/llamaindex-workflows' },
            { text: 'Dify / Coze / FastGPT', link: '/workflow/dify' },
            { text: '编排模式（顺序/并行/条件/循环）', link: '/workflow/patterns' },
            { text: '工作流与 Agent 的边界 Workflow vs Agent', link: '/workflow/workflow-vs-agent' },
          ],
        },
      ],

      '/frameworks/': [
        {
          text: '主流 Agent 框架',
          items: [
            { text: '概览', link: '/frameworks/' },
            { text: 'LangChain / LangGraph', link: '/frameworks/langchain' },
            { text: 'LlamaIndex', link: '/frameworks/llamaindex' },
            { text: 'Claude Agent SDK', link: '/frameworks/claude-agent-sdk' },
            { text: 'OpenAI Agents SDK / Swarm', link: '/frameworks/openai-agents-sdk' },
            { text: 'OpenClaw', link: '/frameworks/openclaw' },
            { text: 'Hermes Agent', link: '/frameworks/hermes-agent' },
            { text: 'Pi', link: '/frameworks/pi' },
            { text: '框架选型决策树', link: '/frameworks/comparison' },
          ],
        },
      ],

      '/source/': [
        {
          text: 'Agent 源码解析',
          items: [
            { text: '概览', link: '/source/' },
            { text: 'Claude Code 架构剖析', link: '/source/claude-code' },
            { text: 'Codex CLI 源码', link: '/source/codex-cli' },
            { text: 'Cline / Roo Code', link: '/source/cline' },
            { text: 'OpenHands（原 OpenDevin）', link: '/source/openhands' },
            { text: 'Aider 代码编辑策略', link: '/source/aider' },
            { text: 'SWE-agent', link: '/source/swe-agent' },
            { text: 'GPT Engineer / GPT Pilot', link: '/source/gpt-engineer' },
            { text: 'Pi (earendil-works/pi)', link: '/source/pi-mono' },
            { text: 'Browser Use / Operator', link: '/source/browser-use' },
          ],
        },
      ],

      '/multi-agent/': [
        {
          text: '多 Agent 协作 Multi-Agent',
          items: [
            { text: '概览', link: '/multi-agent/' },
            { text: '多 Agent 架构模式 Patterns', link: '/multi-agent/patterns' },
            { text: 'Agent 通信协议 A2A / ACP / AGNTCY', link: '/multi-agent/communication' },
            { text: '调度者-工作者 Orchestrator-Worker', link: '/multi-agent/orchestrator-worker' },
            { text: 'Agent 协作策略 Collaboration', link: '/multi-agent/collaboration' },
            { text: 'MetaGPT / ChatDev 案例', link: '/multi-agent/metagpt-chatdev' },
          ],
        },
      ],

      '/engineering/': [
        {
          text: 'Agent 工程化',
          items: [
            { text: '概览', link: '/engineering/' },
            { text: '评估体系 Benchmark（SWE-bench / GAIA / τ-bench）', link: '/engineering/evaluation' },
            { text: '用模型评估模型 LLM-as-Judge', link: '/engineering/llm-judge' },
            { text: '可观测性 Observability（LangSmith / Langfuse）', link: '/engineering/observability' },
            { text: 'Agent Harness 设计', link: '/engineering/harness' },
            { text: '成本优化 Cost Optimization', link: '/engineering/cost-optimization' },
            { text: '安全（Injection / Jailbreak / Guardrails）', link: '/engineering/security' },
            { text: '限流与降级 Rate Limiting', link: '/engineering/rate-limiting' },
          ],
        },
      ],

      '/industry/': [
        {
          text: '一线工程分享',
          items: [
            { text: '概览', link: '/industry/' },
          ],
        },
        {
          text: 'OpenAI Engineering',
          collapsed: false,
          items: [
            { text: 'OpenAI Engineering 概览', link: '/industry/openai/' },
            { text: '自我改进的税务 Agent', link: '/industry/openai/building-self-improving-tax-agents-with-codex' },
            { text: 'Codex Windows 沙箱', link: '/industry/openai/building-codex-windows-sandbox' },
            { text: '超算网络与大规模训练', link: '/industry/openai/mrc-supercomputer-networking' },
            { text: '低延迟语音 AI', link: '/industry/openai/delivering-low-latency-voice-ai-at-scale' },
            { text: 'Codex 编排规范 Symphony', link: '/industry/openai/open-source-codex-orchestration-symphony' },
            { text: 'Responses API WebSocket', link: '/industry/openai/speeding-up-agentic-workflows-with-websockets' },
            { text: 'Responses API 计算机环境', link: '/industry/openai/equip-responses-api-computer-environment' },
            { text: '超越限流', link: '/industry/openai/beyond-rate-limits' },
            { text: 'Harness 工程', link: '/industry/openai/harness-engineering' },
            { text: 'Codex App Server', link: '/industry/openai/unlocking-the-codex-harness' },
          ],
        },
        {
          text: 'Anthropic Engineering',
          collapsed: false,
          items: [
            { text: 'Anthropic Engineering 概览', link: '/industry/anthropic/' },
            { text: 'Claude 产品隔离', link: '/industry/anthropic/how-we-contain-claude' },
            { text: 'Claude Code 质量复盘', link: '/industry/anthropic/april-23-postmortem' },
            { text: 'Managed Agents', link: '/industry/anthropic/managed-agents' },
            { text: 'Claude Code auto mode', link: '/industry/anthropic/claude-code-auto-mode' },
            { text: '长周期应用 Harness', link: '/industry/anthropic/harness-design-long-running-apps' },
            { text: 'BrowseComp 评测感知', link: '/industry/anthropic/eval-awareness-browsecomp' },
            { text: '评测基础设施噪声', link: '/industry/anthropic/infrastructure-noise' },
            { text: '并行 Claude 构建 C 编译器', link: '/industry/anthropic/building-c-compiler' },
            { text: '抗 AI 技术评测', link: '/industry/anthropic/ai-resistant-technical-evaluations' },
            { text: 'Agent 评测入门', link: '/industry/anthropic/demystifying-evals-for-ai-agents' },
            { text: '长周期 Agent Harness', link: '/industry/anthropic/effective-harnesses-for-long-running-agents' },
            { text: '高级工具使用', link: '/industry/anthropic/advanced-tool-use' },
            { text: 'MCP 代码执行', link: '/industry/anthropic/code-execution-with-mcp' },
            { text: 'Claude Code 沙箱', link: '/industry/anthropic/claude-code-sandboxing' },
            { text: 'Agent Skills', link: '/industry/anthropic/equipping-agents-for-the-real-world-with-agent-skills' },
            { text: '上下文工程', link: '/industry/anthropic/effective-context-engineering-for-ai-agents' },
            { text: '三个问题复盘', link: '/industry/anthropic/a-postmortem-of-three-recent-issues' },
            { text: '为 Agent 写工具', link: '/industry/anthropic/writing-tools-for-agents' },
            { text: 'Desktop Extensions', link: '/industry/anthropic/desktop-extensions' },
            { text: '多 Agent 研究系统', link: '/industry/anthropic/multi-agent-research-system' },
            { text: 'Claude Code 最佳实践', link: '/industry/anthropic/claude-code-best-practices' },
            { text: 'think 工具', link: '/industry/anthropic/claude-think-tool' },
            { text: 'SWE-bench Sonnet', link: '/industry/anthropic/swe-bench-sonnet' },
            { text: '构建高效 Agent', link: '/industry/anthropic/building-effective-agents' },
            { text: 'Contextual Retrieval', link: '/industry/anthropic/contextual-retrieval' },
          ],
        },
      ],

      '/vertical/': [
        {
          text: '垂直领域 Agent',
          items: [
            { text: '概览', link: '/vertical/' },
            { text: '编程 Agent Coding Agent', link: '/vertical/coding-agent' },
            { text: '深度研究 Agent Deep Research', link: '/vertical/deep-research' },
            { text: '浏览器与电脑操作 Browser / Computer Use', link: '/vertical/browser-agent' },
            { text: '语音 Agent Voice Agent', link: '/vertical/voice-agent' },
            { text: '数据分析 Agent Data Analysis', link: '/vertical/data-analysis' },
            { text: '客服 Agent Customer Service', link: '/vertical/customer-service' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/yibo365/agent-camp' },
    ],

    footer: {
      message: '基于 MIT 协议开源',
      copyright: 'Copyright © 2026 AIGC Camp',
    },

    editLink: {
      pattern: 'https://github.com/yibo365/agent-camp/edit/master/:path',
      text: '在 GitHub 上编辑此页',
    },
  },
})
