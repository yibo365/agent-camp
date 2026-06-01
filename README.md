# AIGC Camp

> AI Agent 学习与面试指南，系统化整理 LLM、Prompt、RAG、Agent、Multi-Agent 等知识。

## 本地开发

```bash
npm install
npm run dev
```

打开终端显示的本地地址查看。

## 构建

```bash
npm run build
```

产物在 `.vitepress/dist`，可直接部署到 Cloudflare Pages / Vercel / Netlify / GitHub Pages。

## 目录结构

```
.
├── .vitepress/          # 站点配置与主题
├── llm/                 # 1. 大模型基础
├── prompt/              # 2. 提示词工程
├── context/             # 3. 上下文工程
├── tools/               # 4. 工具调用
├── rag/                 # 5. RAG 检索增强
├── agent/               # 6. Agent 核心理论
├── workflow/            # 7. 流程编排
├── frameworks/          # 8. 主流 Agent 框架
├── source/              # 9. Agent 源码解析
├── multi-agent/         # 10. 多 Agent 协作
├── engineering/         # 11. Agent 工程化
├── vertical/            # 12. 垂直领域 Agent
├── industry/            # 13. 一线工程分享
└── index.md             # 首页
```

## 贡献

欢迎 PR。每篇文章为独立 Markdown 文件，放在对应分类目录下。
