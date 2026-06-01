<script setup lang="ts">
const pillars = [
  {
    title: '基础层',
    desc: '先把模型、提示词、上下文和工具调用这些共识打牢。',
    links: [
      { text: '大模型基础', href: '/llm/', note: 'Transformer、Token、Embedding、模型选型' },
      { text: '提示词工程', href: '/prompt/', note: 'CoT、ReAct、系统提示词、注入攻防' },
      { text: '上下文工程', href: '/context/', note: '长上下文、记忆、缓存、上下文污染' },
      { text: '工具调用', href: '/tools/', note: 'Function Calling、Schema、MCP、沙箱' },
    ],
  },
  {
    title: '能力层',
    desc: '理解 Agent 如何检索、规划、执行和协作。',
    links: [
      { text: 'RAG 检索增强', href: '/rag/', note: '切分、检索、重排、GraphRAG、评估' },
      { text: 'Agent 核心理论', href: '/agent/', note: '定义、循环、规划、反思、自我纠错' },
      { text: '流程编排', href: '/workflow/', note: 'LangGraph、Dify、条件流、循环流' },
      { text: '多 Agent 协作', href: '/multi-agent/', note: '通信协议、调度者、协作策略' },
    ],
  },
  {
    title: '实现层',
    desc: '把理论落到框架、源码和垂直场景里。',
    links: [
      { text: '主流 Agent 框架', href: '/frameworks/', note: 'LangChain、AutoGen、CrewAI、Pydantic AI' },
      { text: 'Agent 源码解析', href: '/source/', note: 'Claude Code、Codex CLI、Cursor、Cline' },
      { text: '垂直领域 Agent', href: '/vertical/', note: 'Coding、Deep Research、Browser、Voice' },
    ],
  },
  {
    title: '生产层',
    desc: '面试高频的评估、监控、成本和安全问题。',
    links: [
      { text: 'Agent 工程化', href: '/engineering/', note: 'Benchmark、Observability、成本、安全、限流' },
      { text: '一线工程分享', href: '/industry/', note: 'OpenAI、Anthropic 工程博客中文导读' },
      { text: '评估体系', href: '/engineering/evaluation', note: 'SWE-bench、GAIA、AgentBench、MMAU' },
      { text: '安全与防护', href: '/engineering/security', note: 'Prompt Injection、Jailbreak、Guardrails' },
    ],
  },
]

const routeSteps = [
  {
    label: '理解模型',
    title: '先建立 LLM 直觉',
    text: '知道模型为什么能推理、为什么会幻觉、为什么需要上下文管理。',
    href: '/llm/',
  },
  {
    label: '掌握交互',
    title: '再练 Prompt 与工具调用',
    text: '能把任务拆成结构化输入、工具 Schema、失败重试和安全边界。',
    href: '/tools/',
  },
  {
    label: '构建 Agent',
    title: '进入 RAG 与 Agent 架构',
    text: '理解检索、规划、执行、反思、记忆这些模块如何组合成系统。',
    href: '/agent/',
  },
  {
    label: '准备生产',
    title: '最后补工程化面试题',
    text: '覆盖评估、观测、成本、安全和限流，能回答从 Demo 到上线的问题。',
    href: '/engineering/',
  },
]

const questions = [
  { q: '如何判断一个需求该用 Workflow 还是 Agent？', href: '/workflow/workflow-vs-agent' },
  { q: 'RAG 效果差时应该优先排查哪几层？', href: '/rag/evaluation' },
  { q: 'Function Calling 的 Schema 怎样设计才稳定？', href: '/tools/schema-design' },
  { q: 'Agent Memory 和普通会话历史有什么区别？', href: '/agent/memory-arch' },
  { q: '如何评估一个 Coding Agent 是否真的进步？', href: '/engineering/evaluation' },
  { q: 'Prompt Injection 在工具调用里怎么防？', href: '/engineering/security' },
]

const stats = [
  { value: '13', label: '知识模块' },
  { value: '100+', label: '知识页面' },
  { value: '4', label: '学习阶段' },
]
</script>

<template>
  <main class="agent-home">
    <section class="agent-hero" aria-labelledby="home-title">
      <div class="agent-shell agent-hero__grid">
        <div class="agent-hero__copy">
          <p class="agent-kicker">Agent 工程师面试资料库</p>
          <h1 id="home-title">Agent 工程师面试知识体系</h1>
          <p class="agent-hero__lead">
            从底层模型到生产落地，按面试问题组织 Agent 工程能力。
          </p>
          <div class="agent-hero__actions" aria-label="首页主要操作">
            <a class="agent-button agent-button--primary" href="/llm/">开始学习</a>
            <a class="agent-button agent-button--secondary" href="#roadmap">查看路线</a>
          </div>
        </div>

        <aside class="agent-map" aria-label="Agent 工程师学习地图">
          <div class="agent-map__header">
            <span>学习地图</span>
            <span>Interview Ready</span>
          </div>
          <div class="agent-map__body">
            <a
              v-for="(step, index) in routeSteps"
              :key="step.href"
              class="agent-map__node"
              :href="step.href"
            >
              <span class="agent-map__index">{{ String(index + 1).padStart(2, '0') }}</span>
              <span>
                <strong>{{ step.label }}</strong>
                <small>{{ step.title }}</small>
              </span>
            </a>
          </div>
        </aside>
      </div>
    </section>

    <section class="agent-stats" aria-label="资料规模">
      <div class="agent-shell agent-stats__grid">
        <div v-for="item in stats" :key="item.label" class="agent-stat">
          <strong>{{ item.value }}</strong>
          <span>{{ item.label }}</span>
        </div>
        <p>
          资料按面试路径组织，适合从零梳理，也适合临考查漏。
        </p>
      </div>
    </section>

    <section id="roadmap" class="agent-section agent-shell" aria-labelledby="roadmap-title">
      <div class="agent-section__header">
        <h2 id="roadmap-title">推荐学习路径</h2>
        <p>按面试准备顺序走，先补底层概念，再进入系统设计和工程落地。</p>
      </div>

      <div class="agent-route">
        <a v-for="step in routeSteps" :key="step.href" class="agent-route__item" :href="step.href">
          <span>{{ step.label }}</span>
          <strong>{{ step.title }}</strong>
          <p>{{ step.text }}</p>
        </a>
      </div>
    </section>

    <section class="agent-section agent-shell" aria-labelledby="system-title">
      <div class="agent-section__header">
        <h2 id="system-title">知识体系总览</h2>
        <p>像目录一样按层展开，方便快速定位每个知识点。</p>
      </div>

      <div class="agent-system">
        <article v-for="pillar in pillars" :key="pillar.title" class="agent-pillar">
          <div class="agent-pillar__head">
            <h3>{{ pillar.title }}</h3>
            <p>{{ pillar.desc }}</p>
          </div>
          <div class="agent-pillar__links">
            <a v-for="link in pillar.links" :key="link.href" :href="link.href">
              <span>{{ link.text }}</span>
              <small>{{ link.note }}</small>
            </a>
          </div>
        </article>
      </div>
    </section>

    <section class="agent-section agent-shell agent-questions" aria-labelledby="question-title">
      <div class="agent-section__header">
        <h2 id="question-title">按面试问题查漏</h2>
        <p>如果时间有限，可以从这些问题倒推薄弱章节。</p>
      </div>

      <div class="agent-question-grid">
        <a v-for="item in questions" :key="item.href" :href="item.href">
          {{ item.q }}
        </a>
      </div>
    </section>

    <section class="agent-final agent-shell" aria-labelledby="final-title">
      <div>
        <h2 id="final-title">从第一章开始，逐步补齐面试能力</h2>
        <p>建议把每章当成一组面试题来读：先能讲清概念，再能说出工程取舍。</p>
      </div>
      <a class="agent-button agent-button--primary" href="/llm/">开始学习</a>
    </section>
  </main>
</template>
