# OpenAI 如何大规模交付低延迟语音 AI

- 原文标题：How OpenAI delivers low-latency voice AI at scale
- 原文链接：https://openai.com/index/delivering-low-latency-voice-ai-at-scale/
- 发布时间：2026-05-04
- 来源：OpenAI Engineering
- 主题：实时语音、WebRTC、全球 relay、低延迟系统

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

语音 AI 的体验和文本聊天很不同。文本可以等几秒，语音对话一旦延迟过高，用户就会感觉不自然。文章解释 ChatGPT Voice 和 Realtime API 背后的低延迟媒体路径如何设计。

## 核心内容

- 语音链路包含采集、编码、网络传输、模型处理、合成和播放，每一段都会累积延迟。
- WebRTC 适合实时媒体传输，但在全球规模下还需要 relay、路由和连接质量控制。
- 低延迟不是单点优化，而是端到端路径优化：连接建立、就近接入、媒体转发和服务部署都要配合。
- 语音 Agent 的系统设计要同时考虑吞吐、抖动、断线恢复和用户感知。

## 工程启发

- 对话式产品要以用户感知延迟为指标，而不是只看模型推理时间。
- 实时系统需要全球路由和边缘接入能力；纯中心化架构很难支撑自然语音体验。
- 语音 Agent 的观测要覆盖媒体层、模型层和应用层。

## 和本站章节的关系

- [语音 Agent](../../vertical/voice-agent)
- [推理优化](../../llm/inference-optimization)
- [Agent 工程化 - 可观测性](../../engineering/observability)

## 面试追问

- 文本 Agent 和语音 Agent 的系统瓶颈有什么不同？
- WebRTC 为什么适合实时语音？
- 端到端延迟应该拆成哪些指标观测？
