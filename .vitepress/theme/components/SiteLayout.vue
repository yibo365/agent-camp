<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import BookModeSwitch from './BookModeSwitch.vue'
import BookPagination from './BookPagination.vue'
import BookSidebar from './BookSidebar.vue'
import RepositoryLink from './RepositoryLink.vue'

const DefaultLayout = DefaultTheme.Layout
</script>

<template>
  <DefaultLayout>
    <template #nav-bar-title-after>
      <RepositoryLink />
    </template>
    <template #nav-bar-content-after>
      <BookModeSwitch />
    </template>
    <template #sidebar-nav-before>
      <BookSidebar />
    </template>
    <template #doc-after>
      <BookPagination />
    </template>
  </DefaultLayout>
</template>
