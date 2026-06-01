---
title: 上下文窗口与位置偏置
description: Lost in the Middle——模型对 prompt 中间位置的信息会"看不见"，准确率掉 20%+。理解这个现象决定了所有上下文设计的方向。
pageClass: context-window-bias-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">上下文工程</p>
  <h1>上下文窗口与位置偏置</h1>
  <p class="doc-hero__lead">Lost in the Middle——模型对 prompt 中间位置的信息会"看不见"，准确率掉 20%+。理解这个现象决定了所有上下文设计的方向。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：上下文工程入门必读</span>
    <span>核心现象：U 形注意力分布</span>
    <span>面试重点：成因 + 工程对策</span>
  </div>
</section>

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>Lost in the Middle 是什么？实测掉点幅度多少？</strong>
    <span>考具体数据，能不能讲清现象的严重程度。</span>
  </div>
  <div>
    <strong>为什么注意力会有 U 形分布？根因是什么？</strong>
    <span>考对 RoPE / causal mask / 训练数据偏好的理解。</span>
  </div>
  <div>
    <strong>长上下文模型（Gemini 2M、Claude 200K）是否解决了这个问题？</strong>
    <span>考你跟得上 2024 后的实测，不能只信厂商宣传。</span>
  </div>
  <div>
    <strong>Needle in a Haystack 测试是什么？为什么它过了不代表长上下文真的好用？</strong>
    <span>考评估方法论。</span>
  </div>
  <div>
    <strong>实战中怎么对抗 Lost in the Middle？</strong>
    <span>考工程对策，不能只说"放开头或末尾"。</span>
  </div>
  <div>
    <strong>RAG top-K 的 K 选 5 还是 20？和 Lost in the Middle 有关吗？</strong>
    <span>考 RAG 和上下文偏置的交叉。</span>
  </div>
  <div>
    <strong>Chat history 越积越长会不会让早期 system prompt 失效？</strong>
    <span>考多轮对话的位置偏置。</span>
  </div>
</div>

---

## 为什么这个现象决定了上下文设计

考虑一个简单实验：把 30 段文档放进 prompt，问"第 X 段说了什么"，X 的位置从 1 到 30。

直觉预期：模型应该对所有位置一视同仁。

实测结果（Liu et al. 2024 *Lost in the Middle*，[arxiv 2307.03172](https://arxiv.org/abs/2307.03172)）：

```
准确率：
位置 1：   75%  ← 开头表现最好
位置 5：   60%
位置 10:   50%
位置 15:   45%  ← 中段最差
位置 20:   55%
位置 25:   65%
位置 30:   72%  ← 末尾接近开头
```

U 形分布。**把关键信息放在 prompt 中段，准确率比放开头/末尾低 20-30 个百分点**。

这不是某个模型的 bug，是**所有主流 LLM 的共性**——GPT-3.5/4、Claude 1-3、Llama 2、Qwen 都有，只是程度不同。

**含义**：上下文长度 ≠ 上下文有效长度。你塞 128K token 进去，模型实际"看清"的可能只有开头和末尾的 20K。所有上下文工程技术（压缩、缓存、记忆管理）都是在和这个现象做斗争。

---

## 现象的真实数据

### Liu et al. 2024 原始实验

任务：开放问答（NaturalQuestions），把答案所在的文档放在不同位置：

| 模型 | 答案在开头 | 答案在中间 | 答案在末尾 |
|---|---:|---:|---:|
| **GPT-3.5-Turbo** | 76% | 52% | 64% |
| **Claude 1.3** | 78% | 67% | 75% |
| **LongChat-13B** | 50% | 33% | 41% |

GPT-3.5 中间位置准确率掉 24 个百分点——这意味着不论你的检索多准，把答案放错位置就废了。

### 2024 长上下文模型的最新数据

Gemini 1.5 Pro、Claude 3 Opus、GPT-4-Turbo 等推出后，研究者重新做了类似实验：

- **Needle in a Haystack**：在 100K token 里藏一句"特殊事实"，让模型找。新模型几乎 100% 通过——这是营销榜单
- **Multi-hop 长上下文 QA**：同时需要 3-5 个分散在不同位置的事实——准确率仍然掉 15-20%
- **RULER benchmark** ([Hsieh et al. 2024](https://arxiv.org/abs/2404.06654))：综合长上下文评估，发现**所有模型在 32K 之后能力开始显著退化**

**结论**：长上下文模型显著缓解了"单点检索"，但**多点综合 + 中段精读仍然是普遍弱点**。Lost in the Middle 没消失，只是变隐蔽了。

---

## 为什么会有这个现象

学术界仍在争论，但主流解释有三个：

### 解释 1：训练数据的位置分布偏好

预训练语料里"重要信息出现在文章开头/末尾"的比例远高于"出现在中间"——新闻有 lead，论文有 abstract，章节有总结。模型学到了"开头和末尾更可能含关键信息"的统计偏好。

### 解释 2：Causal Mask + RoPE 的几何效应

Decoder-only Transformer 用 causal mask——每个位置只能 attend 到自己和左侧。RoPE 让 attention 强度随相对距离衰减。两者叠加：

- 末尾位置：能 attend 到所有前面的，但远处衰减
- 中间位置：能 attend 到一部分前面的，且不能看到右侧
- 开头位置：被几乎所有后面的位置 attend 到（"attention sink"现象）

末尾天然有"短距离优势"，开头有"被广泛关注"优势，中间两头不靠。

### 解释 3：Attention Sink

Xiao et al. 2023 *Efficient Streaming Language Models with Attention Sinks* ([arxiv 2309.17453](https://arxiv.org/abs/2309.17453)) 发现：**模型会把大量"无意义但必要的"attention 权重分配给前几个 token**，把它们当成"垃圾桶"。

这导致开头的 token 被高度关注（即使内容无关）——这部分注意力被"浪费"了，但也意外地让开头的"真信息"得到额外权重。

---

## Needle in a Haystack：被误读的评估

各家厂商发新模型时，最爱秀 "100% Needle in a Haystack"。但这个测试的局限要清楚：

### 测试是什么

把一段无关长文档（如《百年孤独》）当 haystack，在某个位置插入一句"特殊事实"（needle），如"The best snack in San Francisco is a sandwich from Mission Cliffs."。问模型"What is the best snack in SF?"，看能不能答对。

### 为什么过了不代表好用

这个测试**只考"单点精准检索"**——一个事实、明显冲突的内容、直接问答。但生产场景的难度远超它：

1. **多点综合**：需要从分散在 50K token 里的 5 个事实推理出答案
2. **隐式信息**：信息不是"直接陈述"，要从上下文推断
3. **干扰信息**：上下文里有 N 段看似相关但实际无关的内容
4. **长程依赖**：后文修正/否定前文，模型要追踪状态变化

NIAH 是个"地板基准"——不过它的模型一定不行，过了它的模型不一定真好用。

### 更严肃的评估

- **RULER** ([arxiv 2404.06654](https://arxiv.org/abs/2404.06654))：13 种长上下文任务，从 NIAH 到多跳 QA 到聚合分析
- **InfiniteBench** ([arxiv 2402.13718](https://arxiv.org/abs/2402.13718))：100K+ 长度的真实任务
- **LongBench v2**：中英文长上下文综合测试

选模型做长上下文应用时，**看 RULER / LongBench v2 分数，不要看 NIAH**。

---

## 实战对策

### 对策 1：关键信息放开头或末尾

最简单的对策。已知 prompt 内容时按重要性排序：

```python
def build_prompt(system_msg, critical_constraints, context_docs, user_query):
    return f"""{system_msg}

{critical_constraints}    # 关键约束放靠前

参考文档:
{context_docs}

用户问题: {user_query}
（重申: {critical_constraints}）     # 末尾再说一遍
"""
```

末尾重申关键约束（如"必须用 JSON 输出"、"不要承诺退款"）——recency bias 反过来利用。

### 对策 2：RAG 时按相关性排序，不要按检索分数倒序

直觉做法：把 reranker 排名 1-5 的文档按分数倒序排（最相关在最前）。

**更好做法**：把最相关的放**末尾**——靠近 query，注意力最高。或者**最相关的放第 1 和最后一个**，次相关的放中间。

实测在 RAG 任务上，"top-1 放末尾"比"top-1 放开头"准确率高 5-10 个百分点。

### 对策 3：用更小的 top-K

如果检索回 20 个 chunks 都塞进 prompt，中间那十几个等于没塞——还浪费 token。**top-K = 3-5 + reranker** 通常比 top-K = 20 不 rerank 效果好。

详见 [RAG - reranking](../rag/reranking)。

### 对策 4：拆分长任务

不要让模型一次性处理 100K token 的输入。拆成：
1. 先让模型摘要每段（map 阶段）
2. 再让模型综合所有摘要（reduce 阶段）

牺牲一次调用的成本，换更高准确率。详见 [上下文压缩与摘要](./compression)。

### 对策 5：在 prompt 中显式标号

```
文档 1: ...
文档 2: ...
...
文档 30: ...

问题: 请综合所有 30 个文档回答 X，并标注答案来自哪些文档编号。
```

强制模型"指认来源"能让它认真扫一遍中间位置——比裸塞效果好。

### 对策 6：测试你的 prompt 是否中段失效

把同样的内容放不同位置跑一遍，看输出是否一致：

```python
def position_robustness_test(query, key_info, distractors, llm):
    results = {}
    for pos in [0, len(distractors)//2, len(distractors)]:
        chunks = distractors[:pos] + [key_info] + distractors[pos:]
        prompt = build_prompt(chunks, query)
        results[pos] = llm.chat(prompt)
    return results
```

如果不同位置输出差异大，说明你的应用受 Lost in the Middle 影响严重。

---

## 多轮对话中的位置偏置

聊天历史本质上也是 context。10 轮对话后，第 1 轮的 system prompt 和早期约束已经在 prompt 的"远端中段"。

**症状**：
- 第 1 轮设的"用 JSON 回答"，第 15 轮就开始输出纯文本
- system prompt 里的拒答规则，长对话后被忽略
- 早期对话里说"我叫小明"，几十轮后模型忘记

**对策**：
- 关键约束在每轮 user message 末尾隐式重申
- 长对话定期"压缩 + 重置"——摘要旧对话，重启会话
- 用 `system message` 的 instruction hierarchy 提高约束权重
- 详见 [会话历史管理](./history)

---

## 常见陷阱

### 陷阱 1：以为支持 128K 就能塞 128K

很多团队选模型只看"最大 context"——这是营销数字。真实可用长度看 RULER 测试。一般规律：
- 声称 128K → 32-64K 内可信
- 声称 1M → 100-200K 内可信
- 声称 2M → 200-400K 内可信

**实测你的业务场景才是真理**。

### 陷阱 2：盲目堆 RAG top-K

"反正能塞下，多塞总比少塞好"——错。中段的 chunk 被忽略 + 引入噪声 + 成本飙升。

精准的少 > 模糊的多。

### 陷阱 3：把 system prompt 放最前面就以为安全

System prompt 放最前面利用了"开头优势"，但**对话越长，开头位置的相对权重越低**。长对话场景仍要在末尾重申关键约束。

### 陷阱 4：用 NIAH 通过判断模型够不够长

NIAH 是"必要不充分"——通过它的模型未必好用，不过它的模型一定不行。生产前用你的真实任务做长上下文压测。

### 陷阱 5：相信"思维链能完全弥补"

让模型先输出推理过程能部分缓解 Lost in the Middle（强制扫一遍上下文），但**不能完全消除**——长上下文 + CoT 的失败率仍显著高于短上下文。

### 陷阱 6：长上下文 + Lost in the Middle + 间接注入

长上下文场景下，攻击者可以**把 prompt injection 藏在中段**——你以为模型会忽略中段所以塞了恶意网页内容，模型实际可能注意到攻击指令。详见 [Prompt 注入攻防](../prompt/injection)。

---

## 面试题深度解析

### Q: Lost in the Middle 的根因是什么？

**30 秒版本**：三个机制叠加：(1) **训练数据偏好**——预训练语料中"重要信息出现在开头/末尾"的比例远高于中间，模型学到了这个统计先验；(2) **Causal mask + RoPE 几何效应**——decoder-only 模型每个位置只能 attend 左侧，RoPE 让注意力随距离衰减，开头有"被广泛关注"优势，末尾有"短距离"优势，中间两头不靠；(3) **Attention sink** ——模型把大量"无意义但必要的"attention 分配给前几个 token，意外提升了开头的有效权重。三者叠加形成 U 形注意力分布。

**追问**：那有没有从架构层面解决的方案？
有研究方向。例如：(1) **YaRN / ALiBi** 等替代 RoPE 的位置编码，让远距离衰减更平缓；(2) **稀疏 attention** 让模型显式关注关键位置；(3) **训练数据重排**，把关键信息随机放在中段强迫模型学会均匀关注。这些方法都能缓解但没根除。**Lost in the Middle 不只是工程 bug，是 decoder-only + 自回归训练 + 真实语言分布共同造成的结构性问题**。

### Q: 长上下文模型是不是已经解决了 Lost in the Middle？

**30 秒版本**：缓解了但没解决。Needle in a Haystack 之类的"单点检索"测试 Gemini 2M、Claude 200K 几乎 100% 通过——这是营销榜单。但更严肃的 RULER、LongBench v2 测试发现：**所有模型在 32K 之后能力开始显著退化，多点综合推理任务仍比短上下文低 15-20 个百分点**。所以"塞 100K 进去能找到一个事实" ≠ "模型真的看清了 100K"。生产应用仍需配合 RAG、压缩、分块处理等技术。

**追问**：那 Gemini 2M 上下文还有意义吗？
有，但用法变了。它适合：(1) "**一次性塞下不切分**"的场景（如分析一份 200 页合同——切分会破坏理解）；(2) "**整库代码分析**"——RAG 切代码常出错，直接塞效果更好；(3) "**长视频/音频分析**"——这些数据不好切分。**不适合**：高频请求场景（成本飙升）+ 需要精确多点综合的任务。本质：长上下文是"工具箱里的一个新工具"，不是"RAG 的替代品"。

### Q: RAG 的 top-K 应该选 5 还是 20？

**30 秒版本**：**top-K = 3-5 + reranker** 几乎总是优于 top-K = 20。两个原因：(1) **Lost in the Middle**——20 个 chunks 中间那十几个模型基本忽略，等于没塞；(2) **噪声引入**——top-20 里有大量低相关 chunk，干扰最终回答。正确做法是用 reranker（如 BGE-Reranker、Cohere Rerank）从粗召回的 top-50 精排出 top-3-5，质量远高于无 rerank 的 top-20。Lost in the Middle 是 RAG "精排"必要性的核心理由之一。

**追问**：那有没有场景 top-K 要大？
有，少数场景：(1) **聚合性任务**——需要看完所有相关文档汇总信息，K 必须大（但建议用 map-reduce 拆解）；(2) **不确定性高的开放问答**——单个 chunk 信息不够，需要多源印证。但这些场景里 K 也通常不超过 10，且应该用"K 个 chunk 都强相关"而不是"K 大就行"——靠 reranker 而不是 K 来保证质量。

### Q: 长对话怎么对抗位置偏置？

**30 秒版本**：四个机制：(1) **关键约束在每轮 user prompt 末尾隐式重申**——利用 recency bias；(2) **定期摘要 + 会话重启**——长对话后把历史压缩成 200 字摘要，重启上下文；(3) **system message 利用 instruction hierarchy**——OpenAI 后续模型对 system message 有更高优先级权重；(4) **滑动窗口 + 锚点**——保留 system prompt + 最近 N 轮 + 关键里程碑（用户说过的偏好），中间冗余轮次摘要化。**核心思想**：不要让 prompt 无限累加，主动管理"什么留下、什么压缩、什么扔掉"——这就是 [会话历史管理](./history) 的核心。

**追问**：那 Claude 200K + 长对话能不能"不管"，让模型自己处理？
短期内可以撑下去，但有三个问题：(1) **成本飙升**——多轮对话每次都付全量 token 费；(2) **延迟越来越长**——prefill 时间正比于 prompt 长度；(3) **质量缓慢退化**——长上下文越长，模型综合能力越差。**结论**：即使有 200K 上下文，生产 Agent 也应该主动管理对话历史，把上下文当成稀缺资源。"塞进去能 work"和"产品级体验"是两回事。

---

## 延伸阅读

- **论文：Lost in the Middle** ([arxiv 2307.03172](https://arxiv.org/abs/2307.03172))
  Liu et al. 2024。开创性论文，必读。读它是为了看那个 U 形分布的实证数据——这是所有后续上下文工程的理论基础。

- **论文：RULER — What's the Real Context Size?** ([arxiv 2404.06654](https://arxiv.org/abs/2404.06654))
  Hsieh et al. 2024。13 种长上下文评估任务。读它是为了知道"声称 128K 但实际可用多少"——RULER 分数才是真实能力。

- **论文：Attention Sinks** ([arxiv 2309.17453](https://arxiv.org/abs/2309.17453))
  Xiao et al. 2023。读它是为了理解为什么前几个 token 拿走那么多注意力——这个现象解释了为什么"开头"位置有优势。

- **论文：YaRN / NTK-aware RoPE** ([arxiv 2309.00071](https://arxiv.org/abs/2309.00071))
  长上下文扩展的关键技术。读它会让你理解"为什么模型能从训练时的 4K 扩展到 128K"。

- **博客：Greg Kamradt — Needle in a Haystack** ([github.com/gkamradt/LLMTest_NeedleInAHaystack](https://github.com/gkamradt/LLMTest_NeedleInAHaystack))
  NIAH 测试的原始实现。读它是为了亲手跑一遍，看清这个测试的局限。

- **配套阅读**：[长上下文模型对比](./long-context) — 各家长上下文模型的实测对比。[上下文压缩与摘要](./compression) — 主动管理长上下文的工程对策。
