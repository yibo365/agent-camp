# 大模型基础

理解 Agent，先理解承载它的大模型。本章覆盖从底层架构到推理调优的全部内容。

## 本章内容

- [Transformer 架构](./transformer) — Attention 机制、位置编码、Decoder-only vs Encoder-Decoder
- [Tokenization](./tokenization) — BPE、SentencePiece、Tiktoken 与中文分词
- [Embedding](./embedding) — 词向量、句向量、主流 Embedding 模型
- [预训练 / SFT / RLHF / DPO](./training) — 大模型四阶段训练范式
- [推理参数详解](./inference-params) — temperature、top_p、top_k、penalty 调优
- [推理优化](./inference-optimization) — KV Cache、量化、FlashAttention、Speculative Decoding
- [主流模型对比](./models) — GPT、Claude、Gemini、Llama、Qwen、DeepSeek 横向评测
- [模型选型与持续重评面试深挖](./model-selection-interview) — 业务 eval、分阶段指标、成本延迟、合规边界和退出条件
- [开源 vs 闭源选型](./open-vs-closed) — 业务场景下的选型矩阵

## 学习路径

1. 先掌握 **Transformer + Tokenization + Embedding** 这三个基石概念
2. 理解 **训练范式**，知道 Base Model / Instruct Model / Reasoning Model 的差别
3. 实战时重点掌握 **推理参数** 与 **推理优化**
4. 选型阶段先看 **主流模型对比** 与 **开源 vs 闭源**，准备面试追问时再看 **模型选型与持续重评面试深挖**
