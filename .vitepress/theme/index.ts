import DefaultTheme from 'vitepress/theme'
import SiteLayout from './components/SiteLayout.vue'
import HomePage from './components/HomePage.vue'
import MermaidBlock from './components/MermaidBlock.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: SiteLayout,
  enhanceApp({ app }) {
    app.component('HomePage', HomePage)
    app.component('MermaidBlock', MermaidBlock)
  },
}
