<script setup lang="ts">
import type { DefaultTheme } from 'vitepress/theme'
import { inBrowser, useData, useRoute } from 'vitepress'
import { computed, nextTick, ref, watch } from 'vue'
import {
  buildBookParts,
  isPathInChapter,
  normalizeBookPath,
} from '../bookNavigation'
import { useBookMode } from '../composables/useBookMode'
import BookSidebarItem from './BookSidebarItem.vue'

const route = useRoute()
const { theme } = useData<DefaultTheme.Config>()
const { bookMode } = useBookMode()
const parts = computed(() => buildBookParts(theme.value))
const chapters = computed(() => parts.value.flatMap((part) => part.chapters))
const sectionNumbers = computed(() => {
  const numbers: Record<string, string> = {}

  for (const chapter of chapters.value) {
    let sectionOrder = 0

    const visit = (items: DefaultTheme.SidebarItem[]) => {
      for (const item of items) {
        if (item.link) {
          sectionOrder += 1
          numbers[normalizeBookPath(item.link)] = `${chapter.order}.${sectionOrder}`
        }

        if (item.items?.length) visit(item.items)
      }
    }

    visit(chapter.groups)
  }

  return numbers
})
const expanded = ref<Record<string, boolean>>({})

function chapterIsActive(root: string) {
  return isPathInChapter(route.path, root)
}

function chapterIsExpanded(root: string) {
  return expanded.value[root] ?? chapterIsActive(root)
}

function toggleChapter(root: string) {
  expanded.value[root] = !chapterIsExpanded(root)
}

watch(
  [() => route.path, parts, bookMode],
  async () => {
    for (const chapter of chapters.value) {
      if (chapterIsActive(chapter.root)) {
        expanded.value[chapter.root] = true
      }
    }

    if (inBrowser && bookMode.value) {
      await nextTick()
      document
        .querySelector('.BookSidebarItem__link[aria-current="page"]')
        ?.scrollIntoView({ block: 'nearest' })
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="BookSidebar" aria-label="全书目录">
    <div class="BookSidebar__header">
      <span>目录</span>
      <strong>Agent Camp</strong>
    </div>

    <div class="BookSidebar__chapters">
      <section
        v-for="chapter in chapters"
        :key="chapter.root"
        class="BookSidebar__chapter"
      >
        <button
          class="BookSidebar__chapterButton"
          type="button"
          :aria-expanded="chapterIsExpanded(chapter.root)"
          @click="toggleChapter(chapter.root)"
        >
          <span class="BookSidebar__chapterNumber">
            {{ String(chapter.order).padStart(2, '0') }}
          </span>
          <span class="BookSidebar__chapterTitle">{{ chapter.title }}</span>
          <span class="BookSidebar__chevron" aria-hidden="true" />
        </button>

        <div v-show="chapterIsExpanded(chapter.root)" class="BookSidebar__chapterBody">
          <ul
            v-if="chapter.groups[0]?.items?.length"
            class="BookSidebar__articleList"
          >
            <BookSidebarItem
              v-for="item in chapter.groups[0].items"
              :key="item.link || item.text"
              :item="item"
              :current-path="route.path"
              :section-numbers="sectionNumbers"
            />
          </ul>

          <section
            v-for="group in chapter.groups.slice(1)"
            :key="group.link || group.text"
            class="BookSidebar__subgroup"
          >
            <a v-if="group.link" :href="group.link">{{ group.text }}</a>
            <h3 v-else>{{ group.text }}</h3>
            <ul v-if="group.items?.length" class="BookSidebar__articleList">
              <BookSidebarItem
                v-for="item in group.items"
                :key="item.link || item.text"
                :item="item"
                :current-path="route.path"
                :section-numbers="sectionNumbers"
              />
            </ul>
          </section>
        </div>
      </section>
    </div>
  </div>
</template>
