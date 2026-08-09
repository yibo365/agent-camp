<script setup lang="ts">
import { onMounted, ref } from 'vue'

const repositoryUrl = 'https://github.com/yibo365/agent-camp'
const mounted = ref(false)

onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <span v-if="!mounted" class="RepositoryLink RepositoryLink--placeholder" aria-hidden="true">
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 .7C5.6.7.4 5.9.4 12.3c0 5.1 3.3 9.5 7.9 11 .6.1.8-.2.8-.6v-2.2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.5.2 2.7.1 3 .8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .4.2.7.8.6a11.6 11.6 0 0 0 7.9-11C23.6 5.9 18.4.7 12 .7Z" />
    </svg>
  </span>

  <Teleport v-else to=".VPNavBarTitle">
    <a
      class="RepositoryLink"
      :href="repositoryUrl"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="GitHub 仓库"
      title="GitHub 仓库"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 .7C5.6.7.4 5.9.4 12.3c0 5.1 3.3 9.5 7.9 11 .6.1.8-.2.8-.6v-2.2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.5.2 2.7.1 3 .8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .4.2.7.8.6a11.6 11.6 0 0 0 7.9-11C23.6 5.9 18.4.7 12 .7Z" />
      </svg>
    </a>
  </Teleport>
</template>
