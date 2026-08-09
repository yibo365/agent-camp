<script setup lang="ts">
import type { DefaultTheme } from 'vitepress/theme'
import { useData, useRoute } from 'vitepress'
import { computed } from 'vue'
import {
  buildBookParts,
  flattenBookArticles,
  normalizeBookPath,
} from '../bookNavigation'

const route = useRoute()
const { theme } = useData<DefaultTheme.Config>()

const articles = computed(() => flattenBookArticles(buildBookParts(theme.value)))
const currentIndex = computed(() => articles.value.findIndex(
  (article) => normalizeBookPath(article.link) === normalizeBookPath(route.path),
))
const previous = computed(() => currentIndex.value > 0
  ? articles.value[currentIndex.value - 1]
  : undefined)
const next = computed(() => currentIndex.value >= 0
  ? articles.value[currentIndex.value + 1]
  : undefined)
</script>

<template>
  <nav v-if="previous || next" class="BookPagination" aria-label="全书翻页">
    <a v-if="previous" class="BookPagination__link BookPagination__link--prev" :href="previous.link">
      <span>上一篇 · {{ previous.chapter }}</span>
      <strong>{{ previous.text }}</strong>
    </a>
    <span v-else />

    <a v-if="next" class="BookPagination__link BookPagination__link--next" :href="next.link">
      <span>下一篇 · {{ next.chapter }}</span>
      <strong>{{ next.text }}</strong>
    </a>
  </nav>
</template>
