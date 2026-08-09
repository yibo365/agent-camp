import { inBrowser } from 'vitepress'
import { onMounted, readonly, ref } from 'vue'

const STORAGE_KEY = 'agent-camp-reading-mode'
const bookMode = ref(true)
let initialized = false

function applyModeClass(enabled: boolean) {
  if (!inBrowser) return
  document.documentElement.classList.toggle('book-mode-enabled', enabled)
}

function initialize() {
  if (!inBrowser || initialized) return
  initialized = true

  try {
    bookMode.value = window.localStorage.getItem(STORAGE_KEY) !== 'feature'
  } catch {
    bookMode.value = true
  }

  applyModeClass(bookMode.value)
}

function setBookMode(enabled: boolean) {
  bookMode.value = enabled
  applyModeClass(enabled)

  if (!inBrowser) return
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'book' : 'feature')
  } catch {
    // Restricted browsing contexts may disable storage. The shared Vue state
    // still keeps the selected mode for the current session.
  }
}

export function useBookMode() {
  onMounted(initialize)

  return {
    bookMode: readonly(bookMode),
    setBookMode,
  }
}
