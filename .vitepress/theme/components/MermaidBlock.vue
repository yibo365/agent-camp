<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{
  code: string
}>()

const { isDark } = useData()
const activeView = ref<'diagram' | 'source'>('diagram')
const svg = ref('')
const error = ref('')
let mermaidApi: typeof import('mermaid').default | null = null

const sourceCode = computed(() => {
  try {
    return decodeURIComponent(props.code)
  } catch {
    return props.code
  }
})

async function renderDiagram() {
  error.value = ''

  try {
    if (!mermaidApi) {
      const module = await import('mermaid')
      mermaidApi = module.default
    }

    mermaidApi.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: {
        background: 'transparent',
        primaryColor: isDark.value ? '#17362e' : '#eef5f1',
        primaryBorderColor: isDark.value ? '#55aa91' : '#2f7d68',
        primaryTextColor: isDark.value ? '#eef7f3' : '#18221e',
        lineColor: isDark.value ? '#71c7ad' : '#2f7d68',
        textColor: isDark.value ? '#eef7f3' : '#18221e',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      },
    })

    const id = `mermaid-${Math.random().toString(36).slice(2)}`
    const result = await mermaidApi.render(id, sourceCode.value)
    svg.value = result.svg
    await nextTick()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '流程图渲染失败'
    svg.value = ''
  }
}

onMounted(renderDiagram)
watch(isDark, renderDiagram)
watch(sourceCode, renderDiagram)
</script>

<template>
  <figure class="mermaid-block">
    <figcaption class="mermaid-block__header">
      <span>流程图</span>
      <span class="mermaid-block__tabs" role="tablist" aria-label="流程图视图">
        <button
          type="button"
          :class="{ 'is-active': activeView === 'diagram' }"
          @click="activeView = 'diagram'"
        >
          图示
        </button>
        <button
          type="button"
          :class="{ 'is-active': activeView === 'source' }"
          @click="activeView = 'source'"
        >
          源码
        </button>
      </span>
    </figcaption>

    <div v-show="activeView === 'diagram'" class="mermaid-block__diagram">
      <p v-if="error" class="mermaid-block__error">{{ error }}</p>
      <div v-else class="mermaid-block__svg" v-html="svg"></div>
    </div>

    <pre v-show="activeView === 'source'" class="mermaid-block__source"><code>{{ sourceCode }}</code></pre>
  </figure>
</template>
