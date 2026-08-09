<script setup lang="ts">
import type { DefaultTheme } from 'vitepress/theme'
import { computed } from 'vue'
import { normalizeBookPath } from '../bookNavigation'

const props = defineProps<{
  item: DefaultTheme.SidebarItem
  currentPath: string
  sectionNumbers: Record<string, string>
  depth?: number
}>()

const isActive = computed(() => (
  !!props.item.link
  && normalizeBookPath(props.item.link) === normalizeBookPath(props.currentPath)
))

const sectionNumber = computed(() => (
  props.item.link
    ? props.sectionNumbers[normalizeBookPath(props.item.link)]
    : undefined
))
</script>

<template>
  <li class="BookSidebarItem" :class="`BookSidebarItem--depth-${depth || 0}`">
    <a
      v-if="item.link"
      class="BookSidebarItem__link"
      :class="{ 'is-active': isActive }"
      :href="item.link"
      :aria-current="isActive ? 'page' : undefined"
    >
      <span v-if="sectionNumber" class="BookSidebarItem__number">{{ sectionNumber }}</span>
      <span class="BookSidebarItem__text">{{ item.text }}</span>
    </a>
    <span v-else class="BookSidebarItem__label">{{ item.text }}</span>

    <ul v-if="item.items?.length" class="BookSidebarItem__children">
      <BookSidebarItem
        v-for="child in item.items"
        :key="child.link || child.text"
        :item="child"
        :current-path="currentPath"
        :section-numbers="sectionNumbers"
        :depth="(depth || 0) + 1"
      />
    </ul>
  </li>
</template>
