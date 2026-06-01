---
title: 长上下文模型对比
description: Claude 200K、Gemini 2M、Qwen 1M、Kimi 2M——长上下文之争背后的技术路线、实测能力、应用边界。
pageClass: context-long-context-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">上下文工程</p>
  <h1>长上下文模型对比</h1>
  <p class="doc-hero__lead">Claude 200K、Gemini 2M、Qwen 1M、Kimi 2M——长上下文之争背后的技术路线、实测能力、应用边界。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：长上下文应用选型</span>
    <span>核心：实测能力 vs 标称长度</span>
    <span>面试重点：长上下文的技术实现</span>
  </div>
</section>

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>模型从训练时 4K 扩展到 200K 上下文，技术上做了什么？</strong>
    <span>考对 RoPE 外推 / YaRN / 训练阶段的理解。</span>
  </div>
  <div>
    <strong>"100% Needle in a Haystack" 这个营销说法到底意味着什么？</strong>
    <span>考评估方法论。</span>
  </div>
  <div>
    <strong>Gemini 2M、Claude 200K、Qwen 1M 各家在长上下文上的技术路线区别？</strong>
    <span>考主流模型差异。</span>
  </div>
  <div>
    <strong>长上下文模型的成本结构是怎样的？为什么不是简单的"长度 ×单价"？</strong>
    <span>考定价细节，prefill / cache 等。</span>
  </div>
  <div>
    <strong>什么场景下长上下文真的有优势？什么场景下 RAG 仍然更好？</strong>
    <span>考工程决策。</span>
  </div>
  <div>
    <strong>同时支持长上下文 + 推理（如 o1、R1 Thinking）会有什么新挑战？</strong>
    <span>考前沿趋势。</span>
  </div>
  <div>
    <strong>KV Cache 显存会随上下文长度爆炸吗？怎么应对？</strong>
    <span>考工程实现细节。</span>
  </div>
</div>

---

## 长上下文之争的简史

| 年份 | 里程碑 | 上下文长度 |
|---|---|---|
| 2018 | BERT / GPT-1 | 512 |
| 2020 | GPT-3 | 2K |
| 2022 | ChatGPT (GPT-3.5) | 4K |
| 2023 H1 | GPT-4 | 8K → 32K |
| 2023 H2 | Claude 2 | 100K |
| 2023 Q4 | GPT-4 Turbo / Claude 2.1 | 128K / 200K |
| 2024 Q1 | **Gemini 1.5 Pro** | **1M（开启百万时代）** |
| 2024 Q3 | Gemini 1.5 Pro | 2M |
| 2024 Q3 | Qwen 2.5 Turbo | 1M |
| 2024 Q4 | Kimi | 2M |
| 2025+ | 各家 + 推理模型长上下文版本 | 1M-10M 探索 |

**从 4K 到 2M，5 年涨 500 倍**——但不是所有"长上下文"都生而平等。

---

## 模型怎么获得长上下文

把 4K 训练的模型直接喂 200K 输入——会输出乱码。原因：模型从未在 4K 之外的位置训练过，RoPE 的位置编码外推到没见过的范围会崩。

工业界获得长上下文的三条路：

### 路线 1：位置编码外推 + 少量 fine-tune

代表技术：**YaRN** ([arxiv 2309.00071](https://arxiv.org/abs/2309.00071))、**NTK-aware RoPE**、**Position Interpolation**。

核心 idea：**调整 RoPE 的频率使其"压缩"到训练长度内**。例如训练时 4K，目标 32K，把 RoPE 的位置 "缩放" 8 倍——让模型把 32K 的位置"看成"4K 的等效位置。

然后用少量长样本（比如几亿 token，相对于预训练几万亿 token 是少量）做 continual pre-training。

**优点**：成本低，能快速把现有模型扩展到 10x-50x。
**缺点**：能力不如原生训练，长上下文中段质量明显下降。

Llama 2 → CodeLlama 32K、Mistral 32K 等都是这条路。

### 路线 2：原生长上下文训练

代表：**Gemini 1.5 Pro**、**Claude 3 系列**、**GPT-4.1**。

从训练初期就用长样本（如 100K+ 的整本书、整库代码）训练。不是"扩展"已有模型，是"重新训"。

**优点**：长上下文中段质量最好。
**缺点**：训练成本巨大，要海量长样本（互联网上 100K 长度的连贯文本本来就稀缺）。

### 路线 3：架构创新

代表：**Mamba**（状态空间模型）、**Linear Attention**、**MoE for long context**。

突破 Transformer 的 O(n²) 复杂度限制。Mamba 等模型理论上能处理无限长上下文，但工业可用性仍在追赶 Transformer。

2024-2025 主流仍是 Transformer + 路线 1/2 的组合。Mamba 等是"暗流涌动"的研究方向。

---

## 各家技术路线对比

### Gemini 1.5/2.x Pro：MoE + 原生长训练

Google 2024 *Gemini 1.5 Technical Report*。关键技术：
- **稀疏 MoE**：减少长序列的实际计算量
- **原生 1M-2M 训练**：从训练开始就用百万级长度
- **TPU 训练优势**：Google 自家 TPU 对超长序列优化好

实测能力：百万级 NIAH 几乎 100%，多事实综合也是当前最强之一。

### Claude 3-4 系列：纯 Transformer + 高质量长训练

Anthropic 的路线：不追极致长度（200K-1M 而非 2M），但每 K 上下文的质量极高。Sonnet 系列在 100K-200K 多任务综合常居榜首。

技术细节 Anthropic 不太公开，但已知用了大量"高质量长文档"训练（书籍、长报告、代码库），不是简单堆量。

### Qwen / Kimi：YaRN 路线 + 中文优化

阿里 Qwen 2.5 Turbo 和月之暗面 Kimi 走"YaRN + continual pretraining"路线，把基础模型扩到 1M-2M。优势：中文长文档场景表现优于国外模型（Kimi 是国内最早做长上下文的）。

### DeepSeek-V3：MLA 压缩 + 适度长上下文

DeepSeek 路线侧重推理效率。MLA（Multi-head Latent Attention）大幅压缩 KV Cache，让长上下文显存可控。上下文长度做到 128K——不追极致长度，但成本和延迟领先。

### OpenAI GPT-4.1 / o 系列：Hybrid

GPT-4.1 把上下文从 128K 扩到 1M。o 系列（推理模型）支持长上下文但内部推理会生成大量 token，实际可用 context 比标称小。

---

## 实测能力对比（2025 当前）

NIAH 单点检索几乎全部 100%，已无区分度。看更严肃的评测：

### RULER 综合长上下文（13 项任务）

近似数据（持续更新中）：

| 模型 | 32K | 128K | 1M |
|---|---:|---:|---:|
| **Gemini 2.x Pro** | ~95 | ~90 | ~80 |
| **Claude 3.7/4 Opus** | ~93 | ~88 | N/A |
| **GPT-4.1** | ~92 | ~85 | ~70 |
| **Qwen 2.5-Turbo** | ~88 | ~75 | ~60 |
| **Kimi** | ~85 | ~73 | ~58 |
| **Llama 4 / DeepSeek-V3** | ~85 | ~72 | N/A |

**关键观察**：所有模型 32K → 128K 都掉 5-10 分，128K → 1M 都掉 10-20 分。**没有任何模型在百万级真正"无损"**。

### 长文档实际任务

- **长代码理解**（如分析 100K token 的 codebase）：Claude > GPT > Gemini
- **长视频理解**：Gemini 独占（原生视频输入）
- **多文档综合**（如 50 份报告找趋势）：Gemini ≈ Claude
- **超长上下文 + 复杂推理**：还在追赶人类水平

---

## 成本与延迟

长上下文的真实成本不只是"长度 × 单价"。

### 三个成本维度

**1. Input token 单价**（直接成本）：
| 模型 | input $/M token |
|---|---|
| GPT-4o | $2.5 |
| Claude Sonnet 4.x | ~$3 |
| Gemini 2.x Pro | ~$1.25（128K以下）/ ~$2.5（128K+） |
| Qwen-Long | ~¥0.5（极便宜） |

**2. Prefill 延迟**（首字延迟 TTFT）：
- 100K token prefill 大约 5-15 秒（取决于硬件和模型）
- 1M token prefill 可能 30 秒-2 分钟
- 实时对话场景几乎不可用，只适合异步任务

**3. KV Cache 显存**：
- Llama-7B fp16 每 token KV Cache 约 512 KB
- 100K token = 50 GB（一张 A100 装不下）
- 1M token = 500 GB（需要多卡 + KV Cache 量化）

**Prompt Cache 让长上下文可用**：
- Anthropic / Gemini / DeepSeek 都支持 prompt cache
- 重复使用的长 context（如"分析同一份文档的不同问题"）只在第一次付全价，后续命中 cache 后输入 token 价格减 80-90%
- 这是长上下文应用的核心成本优化（详见 [上下文缓存](./caching)）

---

## 选型决策

### 场景 1：实时对话 + 长上下文需求

**推荐**：Claude Sonnet 系列（200K）+ prompt cache

理由：质量稳定、延迟可控、cache 命中后成本低。

### 场景 2：分析超长文档（100 页报告、整本书）

**推荐**：Gemini 2.x Pro（1M-2M）

理由：原生长训练质量最好；异步分析延迟不敏感；价格在 128K 内有优势。

### 场景 3：视频/音频长上下文

**唯一选择**：Gemini 系列

理由：其他模型只能文本，Gemini 原生支持视频（每分钟视频约 250 token）。

### 场景 4：代码库整库分析

**推荐**：Claude（最强代码 + 200K）或 Gemini 2.x（1M-2M）

实战：Cursor / Windsurf / Cline 等编程 Agent 后端多用 Claude，因为代码能力是核心。

### 场景 5：中文长文档

**推荐**：Kimi、Qwen-Long、DeepSeek

理由：中文 tokenization 优化好（token 数少）、中文长文档训练数据多、价格便宜。

### 场景 6：高频请求 + 长上下文

**推荐**：自部署开源（Qwen / Llama 4）+ vLLM + KV Cache 量化

理由：闭源 API 高频长上下文成本爆炸；自部署能优化到每 1M token 几分钱。

---

## 长上下文应用的工程注意点

### 注意点 1：用 cache 减少重复 prefill

**最重要的工程优化**。如果同一份长 context 会被多次查询（如"对同一份合同问 20 个问题"），开 prompt cache 后：
- 成本：第 1 次全价，后续每次输入只付 10-20%
- 延迟：第 1 次正常 prefill，后续 prefill 速度大幅提升

详见 [上下文缓存](./caching)。

### 注意点 2：分阶段处理

不要一次性把 100K 塞进 + 问问题。可以：

```
Step 1: 让模型给整个文档生成 outline / key facts（一次性消耗 100K，但只输出 2K）
Step 2: 用 outline + 用户问题做精准检索（短 prompt）
Step 3: 只把相关章节 + 问题塞回 LLM
```

把"全量上下文"作为离线 indexing 用，在线只用精选片段。

### 注意点 3：监控真实有效长度

把同样的关键信息放在 prompt 不同位置，看输出是否一致。如果发现某长度后准确率掉，**该长度就是你应用的"真实可用上限"**，不是模型标称的最大值。

### 注意点 4：KV Cache 显存预算

自部署场景下，KV Cache 显存爆炸是真实问题：
- 用 **GQA / MQA** 减少 KV head 数
- 用 **KV Cache 量化**（INT8/FP8）压缩到一半
- 用 **PagedAttention**（vLLM）减少碎片化

详见 [推理优化](../llm/inference-optimization)。

### 注意点 5：长上下文 + 推理模型的特殊性

o1 / R1 / Claude Thinking 等推理模型，内部会生成大量"思考 token"。
- 输入 100K + 思考 50K + 输出 5K = 实际占用 155K
- "上下文长度"实际是输入 + 推理 + 输出三者总和

用推理模型 + 长上下文要保留足够 budget 给"思考过程"，否则可能在中途被截断。

---

## 常见陷阱

### 陷阱 1：用 NIAH 通过判断长上下文够不够

NIAH 是"地板基准"——必要不充分。生产用 RULER 或 InfiniteBench 实测才靠谱。

### 陷阱 2：假设 1M 能塞 1M 还快

1M token prefill 时间数十秒到几分钟。实时场景几乎不可用。**长上下文 = 异步分析的工具，不是实时对话的工具**。

### 陷阱 3：高频场景直接 API 调长上下文

按 token 计费 + 长 prompt = 月成本快速失控。务必：
- 开 prompt cache 节省重复 input 成本
- 评估是否能用 RAG 替代（如果只需要每次塞小部分内容）
- 高频 + 长上下文 → 自部署开源

### 陷阱 4：以为长上下文 = RAG 死亡

不是。长上下文擅长"一次性塞下不切分"的场景，RAG 擅长"海量文档检索 + 频繁查询"。两者目标不同。生产里常见组合：RAG 粗筛 + 长上下文精读。

### 陷阱 5：忽略长上下文的安全风险

长上下文 + 间接注入 = 灾难。攻击者在 100K 上下文的某个角落塞 prompt injection，模型可能照执行。详见 [Prompt 注入攻防](../prompt/injection)。

### 陷阱 6：相信"长上下文模型不需要 system prompt 工程"

模型越能塞，越要主动管理上下文。否则 prompt 无限累加 → 成本爆炸 + Lost in the Middle + KV Cache 爆显存。

---

## 面试题深度解析

### Q: 模型怎么从训练时的 4K 扩展到 200K-2M 上下文？

**30 秒版本**：三条路线：(1) **YaRN / NTK-aware RoPE**——调整 RoPE 频率把长位置"压缩"到训练范围内，配合少量长样本 fine-tune，成本低能扩展 10-50x，但中段质量下降；(2) **原生长上下文训练**——从训练初期就用 100K+ 长样本，Gemini / Claude 3+ 走这条，质量好但训练成本巨大；(3) **架构创新**（Mamba、Linear Attention）——突破 O(n²) 限制，理论无限上下文，但工业可用性仍追赶 Transformer。2024-2025 主流是路线 2 + 路线 1 的混合。

**追问**：为什么不能从训练就用 1M 长上下文？
两个根本原因：(1) **训练成本 quadratic**——序列长度翻倍，attention 计算量四倍。从 4K 训到 1M 是 250x 数据量需求；(2) **真实长上下文数据稀缺**——互联网上 100K+ 长度的高质量连贯文本极少（书籍、长报告才够），无法支撑预训练数据规模。所以即使是 Gemini 这种"原生长上下文"模型，也是先用短样本预训练，再用长样本 continual pretraining 扩展。**纯长上下文从头训目前在工程上不可行**。

### Q: 长上下文模型的真实成本结构是怎样的？

**30 秒版本**：三层成本：(1) **input token 单价**——直接成本，按 token 数线性增加；(2) **prefill 延迟**——首字延迟随长度线性增加，100K 通常 5-15 秒、1M 30 秒-2 分钟；(3) **KV Cache 显存**——自部署场景下，1M token KV Cache 可能 500GB，需要多卡 + 量化。**关键工程优化是 prompt cache**——Anthropic / Gemini / DeepSeek 都支持，重复使用的长 context 第一次付全价、后续 80-90% 折扣。**长上下文应用没有 cache 几乎不可能 scale**——这是必须掌握的优化。

**追问**：那 cache 命中率怎么算？
看场景。"对同一份长文档问多个问题" 命中率几乎 100%（第一次后全命中）；"每个用户都用同样的 system prompt" 命中率高（user message 不命中但 system 部分命中）；"每个请求都不同" 命中率 0。设计上要**把"固定不变的长内容"放 prompt 开头**——cache 是 prefix matching，开头一致才能命中。详见 [上下文缓存](./caching)。

### Q: 长上下文 vs RAG，怎么选？

**30 秒版本**：不是替代关系，是适用场景不同。**长上下文优势**：一次性塞下不切分（保留全局结构）、零检索失败风险（全在里面）、不需要维护向量库基础设施。**RAG 优势**：海量文档可处理（TB 级）、单次请求成本低、知识可增量更新、可解释性强（能指出答案来源）。**实战常组合**：RAG 粗筛（从 100 万文档选 50 段）+ 长上下文精读（把这 50 段全塞进 prompt 综合分析）。Anthropic 2024 *Contextual Retrieval* 就是这种思路。

**追问**：那什么场景一定不能用长上下文？
四类场景：(1) **TB 级知识库**——物理上塞不下；(2) **实时对话（< 2 秒响应）**——prefill 延迟扛不住；(3) **高频请求（日百万次以上）**——单次几十万 token 输入成本爆炸；(4) **需要可解释来源**——长上下文是黑盒，RAG 能指出"答案来自第 X 段"。这些场景必须 RAG。

### Q: 同时用长上下文 + 推理模型有什么新挑战？

**30 秒版本**：推理模型（o1、R1、Claude Thinking）内部会生成大量思考 token。"上下文长度"实际是 input + 推理过程 + output 三者总和。100K 输入 + 50K 思考 + 5K 输出 = 实际占用 155K。所以用推理模型时**要为思考过程预留 budget**，否则可能中途被截断。另外，推理模型的成本是按"全部 token"算的（包括内部思考），长上下文 + 推理叠加，单次调用可能数十万 token。**经验**：长上下文场景能用普通模型就用普通模型，必须推理时考虑用 hybrid（小模型预处理 + 推理模型针对关键部分）。

**追问**：那为什么 o1 / R1 / Claude Thinking 都支持长上下文？
因为"对长输入做深度推理"是真实需求——分析合同找漏洞、code review 整个 PR、医疗病历综合分析。这些任务既需要长上下文又需要深度推理，不能割裂。当前各家都在做"如何让推理模型在长上下文上不爆炸"的优化，包括：分阶段思考（不一次性把所有思考输出）、思考压缩（边想边丢中间步骤）、selective attention（只对关键部分深度思考）。这是 2025-2026 的重要研究方向。

---

## 延伸阅读

- **论文：Gemini 1.5 Technical Report** ([arxiv 2403.05530](https://arxiv.org/abs/2403.05530))
  Google 2024。读它是为了看"百万级原生长上下文"的训练 setup——这是当时质的飞跃。

- **论文：RULER** ([arxiv 2404.06654](https://arxiv.org/abs/2404.06654))
  Hsieh et al. 2024。长上下文综合评测必读。看完会让你不再相信 NIAH 营销。

- **论文：YaRN** ([arxiv 2309.00071](https://arxiv.org/abs/2309.00071))
  长上下文扩展的关键技术。读它会理解为什么模型能从 4K 扩到 128K。

- **论文：InfiniteBench** ([arxiv 2402.13718](https://arxiv.org/abs/2402.13718))
  100K+ 长度的真实任务评测。配合 RULER 看，建立完整长上下文能力图谱。

- **博客：Anthropic — Contextual Retrieval** ([anthropic.com/news/contextual-retrieval](https://www.anthropic.com/news/contextual-retrieval))
  长上下文 + RAG 的混合架构。读它会理解为什么两者不是替代关系。

- **配套阅读**：[上下文窗口与位置偏置](./window-bias) — 长上下文背后的 Lost in the Middle 问题。[上下文缓存](./caching) — 长上下文应用的关键成本优化。
