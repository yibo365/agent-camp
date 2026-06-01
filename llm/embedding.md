---
title: Embedding
description: 把离散符号变成连续向量的一步——是 token、句子、图像在同一个数学空间里能比较相似度的根本前提。
pageClass: llm-embedding-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">大模型基础</p>
  <h1>Embedding 嵌入</h1>
  <p class="doc-hero__lead">把离散符号映射成稠密向量——LLM 内部所有计算的起点，也是 RAG、推荐、聚类的统一数学基础。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：LLM 入门 + RAG 必读</span>
    <span>核心链路：词向量 / 句向量 / 多模态</span>
    <span>面试重点：模型差异 + 评估指标</span>
  </div>
</section>

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>token embedding、word embedding、sentence embedding 是同一个东西吗？</strong>
    <span>考概念分层，三者完全不同。</span>
  </div>
  <div>
    <strong>word2vec 时代的 embedding 和现在 LLM 内部的 embedding 有什么区别？</strong>
    <span>考静态 vs 上下文化的本质差异。</span>
  </div>
  <div>
    <strong>为什么 GPT 内部的 hidden states 不能直接当 sentence embedding 用？</strong>
    <span>考对 decoder-only 输出语义的理解。</span>
  </div>
  <div>
    <strong>选 embedding 模型时主要看什么指标？维度越高越好吗？</strong>
    <span>考工程选型，MTEB 榜单不能盲信。</span>
  </div>
  <div>
    <strong>OpenAI text-embedding-3 和 BGE 各自的特点？为什么国内常选 BGE？</strong>
    <span>考主流模型熟悉度。</span>
  </div>
  <div>
    <strong>contrastive learning 是怎么训练 embedding 的？为什么需要负样本？</strong>
    <span>考训练原理，能不能讲清 InfoNCE。</span>
  </div>
  <div>
    <strong>同一个 query 和 doc 用不同 embedding 模型编码，余弦相似度数值能不能比？</strong>
    <span>考对向量空间不通约性的认知。</span>
  </div>
</div>

---

## 为什么需要 Embedding

计算机处理文本的根本难题：**词是离散符号，但语义是连续的**。

"苹果" 和 "梨" 应该比 "苹果" 和 "汽车" 更接近，但作为字符串它们之间没有任何数学距离可言。直接用 one-hot 编码——每个词一个独立维度——所有词之间的距离都是 √2，完全捕捉不到语义关系。

Embedding 的核心 idea：**给每个符号分配一个 d 维稠密向量，让"语义相似的符号在向量空间里距离也近"**。这样语义就被翻译成几何——可以用余弦距离、欧氏距离去算相似度，可以用聚类、最近邻去做检索。

举个 Mikolov et al. 2013 *Efficient Estimation of Word Representations in Vector Space* ([arxiv 1301.3781](https://arxiv.org/abs/1301.3781)) 论文里的经典例子：
```
vector("King") - vector("Man") + vector("Woman") ≈ vector("Queen")
```
向量空间里的算术对应到了语义的类比。这种性质不是手工设计的，是从大规模语料中"涌现"的。

**Embedding 解决的就是"离散符号 → 可计算的语义空间"这个转换。** 现代 NLP 的所有进展——从 RAG 到 LLM 本身——都建立在这个基础上。

---

## Embedding 的三个层次

人们说 "embedding" 时可能指三个不同的东西，分清这个是面试基础：

### 1. Token Embedding（最底层）

LLM 内部的 `embedding_layer`。词表里每个 token ID 对应一行 d 维向量。

```python
import torch
import torch.nn as nn

vocab_size = 50000
d_model = 768
embedding_layer = nn.Embedding(vocab_size, d_model)

token_ids = torch.tensor([1234, 5678, 9012])   # 3 个 token
vectors = embedding_layer(token_ids)            # (3, 768)
```

这是 LLM forward 的第一步——把整数 ID 翻译成可微分的稠密向量，喂给 Transformer block。是模型训练时的可学习参数，跟 LM head 加起来占模型参数量的 20%-40%。

### 2. Word/Phrase Embedding（历史阶段）

word2vec、GloVe 时代的产物——**每个词一个固定向量**，跟上下文无关。"苹果" 不论出现在 "吃苹果" 还是 "苹果公司" 里都是同一个向量。

这个范式 2018 年之后基本被取代。但词向量训练里发明的几个核心技术——负采样、InfoNCE、对比学习——至今是所有 embedding 模型的基础。

### 3. Sentence/Document Embedding（今天 RAG 用的）

把任意长度的文本压成**一个固定维度的向量**。BGE、E5、OpenAI text-embedding-3 这一类。

```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer("BAAI/bge-large-zh-v1.5")
vec = model.encode("我爱机器学习")   # (1024,) 的向量
```

这个向量代表整段文本的语义。是 RAG 的根基——文档和 query 都用它编码，余弦相似度判断相关性。

---

## 关键演进：从静态到上下文化

### 阶段 1：静态词向量（word2vec, GloVe, FastText）

训练目标：**让在相似上下文中出现的词，向量也相似**（distributional hypothesis）。

word2vec 的两种训练方式：
- **CBOW**：用上下文预测中心词
- **Skip-gram**：用中心词预测上下文（更常用）

致命缺陷：**一词多义无法处理**。"bank" 在 "river bank" 和 "money in the bank" 里语义完全不同，但 word2vec 给同一个向量。

### 阶段 2：上下文化词向量（ELMo, BERT）

2018 年是分水岭。BERT (Devlin et al. 2018) 让每个 token 的向量都依赖整个句子——同一个词在不同句子里有不同的向量。这是质变。

```python
# 用 BERT 编码 "bank" 在两种语境
inputs1 = tokenizer("I deposited money in the bank", return_tensors="pt")
inputs2 = tokenizer("We sat by the river bank", return_tensors="pt")

with torch.no_grad():
    out1 = model(**inputs1).last_hidden_state  # bank 的向量
    out2 = model(**inputs2).last_hidden_state  # bank 的向量
# 这两个向量距离会比较远
```

### 阶段 3：专门的句向量模型（Sentence-BERT, BGE, E5）

BERT 直接拿来做句向量效果不好（[CLS] token 的向量没经过专门优化）。Reimers & Gurevych 2019 *Sentence-BERT* ([arxiv 1908.10084](https://arxiv.org/abs/1908.10084)) 提出：**用对比学习专门 fine-tune 句向量**——让相似句子的向量距离近、不相似的远。

今天主流的 BGE、E5、GTE、Cohere Embed 都是这个范式：拿一个预训练的 encoder（通常是 BERT 变种），用 contrastive learning + 海量 (query, positive_doc, negative_docs) 三元组 fine-tune。

---

## 核心原理：对比学习与 InfoNCE Loss

现代 sentence embedding 模型几乎都用 **contrastive learning + InfoNCE loss** 训练。核心思想：

**对一个 query，正样本（相关文档）拉近，负样本（无关文档）推远。**

InfoNCE loss 的公式（直觉版）：

```
L = -log( exp(sim(q, d+)/τ) / Σ exp(sim(q, d_i)/τ) )
```

其中：
- `q` 是 query 向量
- `d+` 是正样本（语义相关的文档）
- `d_i` 是 batch 里所有候选（含正负样本）
- `sim()` 通常是余弦相似度
- `τ` 是温度系数，控制 softmax 的"锐度"

**关键设计：负样本从哪来？**

三种来源，越往后越强：
1. **In-batch negatives**：同一 batch 里其他 query 的正样本就当负样本（免费）
2. **Random negatives**：从文档库里随机抽（弱信号）
3. **Hard negatives**：用已有模型检索出 top-K 但实际无关的（强信号，BGE/E5 的核心 trick）

Hard negatives 是 embedding 模型质量分水岭——只用 random negatives 训出来的模型容易在"看起来像但实际无关"的文档上翻车。BGE/E5 系列大量挖 hard negatives 是它们能 SOTA 的原因之一。

---

## 实战：用 embedding 做语义检索

```python
from sentence_transformers import SentenceTransformer
import numpy as np

# 1. 加载模型（这里用 BGE-large 中文版）
model = SentenceTransformer("BAAI/bge-large-zh-v1.5")

# 2. 文档库
docs = [
    "苹果公司今天发布了新款 iPhone，搭载 A18 芯片。",
    "Python 是一门高级编程语言，广泛用于数据科学。",
    "Linux 内核 6.0 引入了对 Rust 语言的支持。",
    "iPhone 16 Pro 的相机系统包含了 48MP 主摄。",
    "深度学习的发展推动了 NLP 领域的革新。",
]
doc_vecs = model.encode(docs, normalize_embeddings=True)  # L2 归一化

# 3. 查询
query = "新发布的手机参数怎么样？"
q_vec = model.encode([query], normalize_embeddings=True)

# 4. 余弦相似度（归一化后直接点积）
scores = (q_vec @ doc_vecs.T)[0]
ranked = np.argsort(-scores)

for i in ranked[:3]:
    print(f"{scores[i]:.3f}  {docs[i]}")

# 输出：
# 0.612  iPhone 16 Pro 的相机系统包含了 48MP 主摄。
# 0.587  苹果公司今天发布了新款 iPhone，搭载 A18 芯片。
# 0.342  深度学习的发展推动了 NLP 领域的革新。
```

注意 `normalize_embeddings=True`——L2 归一化让向量模长为 1，之后余弦相似度退化成简单点积，速度快很多。**生产里所有 embedding 都建议归一化**。

---

## 常见陷阱

### 陷阱 1：直接拿 LLM hidden states 当 sentence embedding

很多人想"既然 GPT 这么强，直接拿它最后一层 hidden state 平均一下当 sentence embedding 不就行了？"——效果**很差**。

原因：decoder-only LLM 的训练目标是 next token prediction，hidden state 的优化方向是"预测下一个词"，不是"代表整句话的语义"。最后一个 token 的 hidden state 通常更偏重句末附近的信息。

正确做法：用专门训练的 sentence embedding 模型（BGE、E5），或者用 LLM2Vec、E5-Mistral 这类对 decoder-only LLM 做了 embedding-friendly fine-tune 的版本。

### 陷阱 2：盲信 MTEB 榜单分数

[MTEB (Massive Text Embedding Benchmark)](https://huggingface.co/spaces/mteb/leaderboard) 是主流 embedding 评测榜。但榜单 SOTA **不等于你的场景效果好**：
- 榜单语料多为英文/通用领域，垂直领域（医疗、法律、代码）需要专门评测
- 榜单模型可能针对榜单任务过拟合
- 维度高的模型分数高，但推理成本和存储成本也高

正确做法：在自己业务的评估集上跑一遍 Recall@K，再看 MTEB 作为参考。

### 陷阱 3：以为维度越高效果越好

OpenAI text-embedding-3-large 默认 3072 维，BGE-large 是 1024 维。维度高了：
- 表征能力上限高
- 存储成本线性增加（百万文档 × 3072 维 × 4 bytes = 12 GB）
- 向量检索延迟线性增加

OpenAI text-embedding-3 支持 **Matryoshka representation**——可以在 3072 维向量上截断成 256/512/1024 维，效果只略微下降。生产里 1024 维通常足够。

### 陷阱 4：用不同 embedding 模型的向量直接比

A 模型编码 query、B 模型编码 doc，算余弦相似度——**无意义**。

不同模型的向量空间完全独立，没有公共参考系。哪怕维度一样、都做了归一化，数值也不可比。**RAG 系统里 query 和 doc 必须用同一个 embedding 模型**。

### 陷阱 5：用 sentence embedding 做精确匹配

"openssl CVE-2024-3094" 这种含具体编号的 query，embedding 经常召回不准——因为 embedding 是"语义压缩"，不擅长精确字符匹配。这就是为什么生产 RAG 要混合 BM25（详见 [混合检索](../rag/hybrid-search)）。

---

## 主流 embedding 模型对比

| 模型 | 维度 | 中文 | 上下文 | 优点 | 适用 |
|---|---|---|---|---|---|
| **OpenAI text-embedding-3-large** | 256-3072 (可截断) | 良好 | 8192 | API 稳定、Matryoshka 可裁 | 通用、不在乎成本 |
| **OpenAI text-embedding-3-small** | 512-1536 | 良好 | 8192 | 便宜、足够好 | 大多数生产场景 |
| **BGE-large-zh-v1.5** (BAAI) | 1024 | 顶级 | 512 | 中文 SOTA、开源 | 中文私有部署 |
| **BGE-M3** (BAAI) | 1024 | 顶级 | 8192 | 多语言 + dense/sparse/multi-vec 三合一 | 复杂检索场景 |
| **E5-mistral-7b** | 4096 | 好 | 4096 | 基于 7B LLM，效果强 | 高质量要求 + 算力充足 |
| **Cohere Embed v3** | 1024 | 好 | 512 | 商业 API、压缩模式 | 海外、希望托管 |
| **Voyage AI** | 1024 | 一般 | 32K | 长上下文、代码场景强 | 代码/法律等长文档 |

**怎么选？**
- 国内私有部署、中文为主 → BGE-large-zh-v1.5 或 BGE-M3
- 海外 API、不想自部署 → OpenAI text-embedding-3-small（性价比最高）
- 代码 / 法律 / 长文档 → Voyage 或 OpenAI（8K context）
- 想试最新最强 → 实时关注 MTEB 榜单

---

## 面试题深度解析

### Q: word2vec 时代的 embedding 和 LLM 内部的 embedding 有什么本质区别？

**30 秒版本**：本质区别是**静态 vs 上下文化**。word2vec 给每个词分配一个固定向量，"bank" 永远是同一个向量；LLM 内部每个 token 的向量都依赖整段输入，"river bank" 里的 bank 和 "money bank" 里的 bank 是不同向量。这种上下文化是 BERT 之后所有大模型的标志性能力，也是 RAG 之所以能 work 的基础。

**追问 1**：那 LLM 里的 token embedding 层（输入层那个 lookup table）不也是静态的吗？
对，输入层的 token embedding 确实是静态的——每个 token ID 永远查到同一行向量。但这个静态向量只是**起点**，经过几十层 Transformer block 后，每个位置的 hidden state 已经融合了全句信息，是上下文化的。所以 LLM 的"embedding"分两层看，输入层静态、输出层（任何中间层）上下文化。

**追问 2**：为什么我们做 RAG 时不直接用 LLM 的输出 hidden state 当 sentence embedding？
两个原因：(1) decoder-only LLM 的训练目标是 next token prediction，hidden state 优化方向是预测下一个词，不是代表全句语义；(2) decoder-only 的 causal mask 让每个位置只能看到左侧，最后一个 token 的 hidden state 偏重句末。所以要么用 encoder-only 模型（BERT 系），要么用专门 contrastive fine-tune 过的 LLM（E5-Mistral、LLM2Vec）。

### Q: contrastive learning 训练 embedding 时，为什么必须要负样本？

**30 秒版本**：因为没有负样本，模型可以走捷径——把所有句子映射到同一个向量，正样本距离就永远是 0，loss 也是 0，但模型什么都没学到。负样本提供"什么不应该靠近"的反向信号，强迫模型把不同语义的向量推开，形成有意义的几何结构。

**追问 1**：那负样本数量多少合适？hard negatives 比 random negatives 强多少？
理论上越多越好但有边际效应。生产实践：每个 query 配 1 个 positive + 1-7 个 hard negatives + batch 内其他 query 的 positive 作为 in-batch negatives。Hard negatives 比 random negatives 强多少没有统一数字，看任务，但在 RAG 检索任务上 Recall@10 通常能提 5-15 个点。

**追问 2**：怎么挖 hard negatives？
经典做法：用一个基础 embedding 模型先检索出 top-K（如 K=100），人工/规则过滤掉真正相关的，剩下的就是 hard negatives（"看起来像但实际无关"）。BGE 训练时还用了 ColBERT 等更强的模型挖 hard negatives，再回头训练自己。这是个 bootstrapping 过程，被称为 hard-negative mining。

### Q: OpenAI text-embedding-3 的 Matryoshka representation 是什么？为什么能截断？

**30 秒版本**：Matryoshka Representation Learning (Kusupati et al. 2022, [arxiv 2205.13147](https://arxiv.org/abs/2205.13147)) 训练时让前 256/512/1024 维都能独立完成检索任务——相当于"套娃"训练。推理时直接截断到任意短的前缀维度，效果几乎不掉。OpenAI text-embedding-3 默认 3072 维，但实际生产可以截到 1024 甚至 512，存储和检索成本大幅下降。

**追问**：这种"前 N 维有效"的训练是怎么实现的？
核心是在 loss 上做手脚：对每个目标维度 d（如 256/512/1024/3072），都计算一次该维度截断后的检索 loss，然后加权求和。模型为了同时让所有截断维度都 work，自然会把最重要的信息放在前面的维度。是个非常优雅的训练技巧，几乎零额外推理成本。

---

## 延伸阅读

- **论文：Efficient Estimation of Word Representations in Vector Space (word2vec)** ([arxiv 1301.3781](https://arxiv.org/abs/1301.3781))
  Mikolov et al. 2013。读它是为了理解 embedding 这个范式的起点——"语义可以用向量距离衡量"这个直觉，从此开启了整个 NLP 的向量化时代。

- **论文：Sentence-BERT** ([arxiv 1908.10084](https://arxiv.org/abs/1908.10084))
  Reimers & Gurevych 2019。读它是为了理解"句向量为什么需要专门训练"——BERT 直接拿来做句向量效果差的根本原因，以及对比学习如何解决。

- **论文：BGE / FlagEmbedding** ([arxiv 2402.03216](https://arxiv.org/abs/2402.03216))
  BAAI 智源团队 2024。当前中文 embedding 的标杆。读它是为了看完整的"挖 hard negatives + 多阶段训练 + 多任务"工业级训练 pipeline。

- **论文：Matryoshka Representation Learning** ([arxiv 2205.13147](https://arxiv.org/abs/2205.13147))
  Kusupati et al. 2022。读它是为了理解"为什么 OpenAI text-embedding-3 可以任意截维"——一个简单的训练技巧，工程价值巨大。

- **榜单：MTEB Leaderboard** ([huggingface.co/spaces/mteb/leaderboard](https://huggingface.co/spaces/mteb/leaderboard))
  Massive Text Embedding Benchmark。看它是为了知道当前 SOTA 模型，但**不能盲信**，自己业务上必须自评。

- **工具：sentence-transformers** ([sbert.net](https://www.sbert.net/))
  最常用的 embedding 工具库，几行代码加载任意 HuggingFace embedding 模型。生产 RAG 必备。
