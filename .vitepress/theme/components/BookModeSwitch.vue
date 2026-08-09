<script setup lang="ts">
import { useData, useRoute, useRouter } from 'vitepress'
import { computed, inject } from 'vue'
import { useBookMode } from '../composables/useBookMode'

const route = useRoute()
const router = useRouter()
const { isDark } = useData()
const { bookMode, setBookMode } = useBookMode()
const toggleAppearance = inject('toggle-appearance', () => {
  isDark.value = !isDark.value
})

const modeLabel = computed(() => bookMode.value ? 'Book' : '功能')
const appearanceLabel = computed(() => isDark.value ? '深色' : '浅色')

function toggleMode() {
  const enabled = !bookMode.value
  setBookMode(enabled)

  if (enabled && route.path === '/') {
    router.go('/llm/')
  }
}
</script>

<template>
  <div class="DisplayControls" aria-label="显示设置">
    <button
      class="DisplayControl"
      type="button"
      role="switch"
      :class="{ 'is-active': isDark }"
      :aria-checked="isDark"
      :title="isDark ? '切换到浅色主题' : '切换到深色主题'"
      @click="toggleAppearance"
    >
      <span class="DisplayControl__track" aria-hidden="true">
        <span class="DisplayControl__thumb" />
      </span>
      <span class="DisplayControl__label">{{ appearanceLabel }}</span>
    </button>

    <span class="DisplayControls__divider" aria-hidden="true" />

    <button
      class="DisplayControl"
      type="button"
      role="switch"
      :class="{ 'is-active': bookMode }"
      :aria-checked="bookMode"
      :title="bookMode ? '切换到功能模式' : '切换到 Book 模式'"
      @click="toggleMode"
    >
      <span class="DisplayControl__track" aria-hidden="true">
        <span class="DisplayControl__thumb" />
      </span>
      <span class="DisplayControl__label">{{ modeLabel }}</span>
    </button>
  </div>
</template>
