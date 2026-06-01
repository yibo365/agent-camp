import DefaultTheme from 'vitepress/theme'
import HomePage from './components/HomePage.vue'
import MermaidBlock from './components/MermaidBlock.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('HomePage', HomePage)
    app.component('MermaidBlock', MermaidBlock)
  },
}
