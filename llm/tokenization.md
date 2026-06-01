---
title: Tokenization
description: BPE、SentencePiece、Tiktoken 与中文分词——LLM 看到的不是字符，是 token，理解这一步才能解释一半的奇怪行为。
pageClass: llm-tokenization-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">大模型基础</p>
  <h1>Tokenization 分词</h1>
  <p class="doc-hero__lead">LLM 不是按字符理解文本的，它看到的是 token——这一步决定了模型怎么算钱、怎么数数、为什么中文比英文贵。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：LLM 入门必读</span>
    <span>核心链路：BPE / SentencePiece / Tiktoken</span>
    <span>面试重点：token 与字符的区别、中英文差异</span>
  </div>
</section>

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>1 个 token 等于多少字？为什么中文和英文相差这么多？</strong>
    <span>考基础概念 + 工程成本意识。</span>
  </div>
  <div>
    <strong>为什么 GPT-4 数不清 "strawberry" 有几个 r？</strong>
    <span>经典面试题，考你对 tokenization 本质的理解。</span>
  </div>
  <div>
    <strong>BPE 是怎么工作的？跟 WordPiece、SentencePiece 区别在哪？</strong>
    <span>考算法本身，能不能讲清训练过程。</span>
  </div>
  <div>
    <strong>为什么不直接按字符 (char) 或字节 (byte) 切？</strong>
    <span>考权衡能力，理解词表大小的 trade-off。</span>
  </div>
  <div>
    <strong>同一段中文，GPT-4 和 Qwen 算出来的 token 数差好几倍。为什么？</strong>
    <span>考对多语言 tokenizer 设计的理解。</span>
  </div>
  <div>
    <strong>API 报 "context length exceeded"，但你算字符数没超。怎么解释？</strong>
    <span>考实战经验，token != 字符。</span>
  </div>
  <div>
    <strong>tokenizer 选错了会怎样？训练和推理用不同 tokenizer 会怎样？</strong>
    <span>考生产事故意识。</span>
  </div>
</div>

---

## 为什么需要 Tokenization

一个直觉的问题：**为什么不直接把文本扔给模型？**

模型的输入必须是数字。文本是离散符号，要先转成数字。最朴素的两种切法都不行：

**按字（character）切**：英文 26 个字母 + 标点，词表小（约 100），但一个单词要拆成 5-10 个 token，序列变得很长——同样语义占的位置成倍增加，attention 的 O(n²) 复杂度直接放大。

**按词（word）切**：词表巨大（英文常用词 5 万、加上各种变形和拼写错误能上百万），且遇到训练集没见过的词只能输出 `<UNK>`，对新词/专有名词完全没办法。

中文更尴尬——没有天然的单词分隔符。"我爱北京天安门" 按词切要先做中文分词（用 jieba 之类），但分词本身就是个 NLP 任务，错了下游全错。

**Subword（子词）tokenization 是折中**：把高频词作为整体（"the"、"ing"），把低频词拆成更小的有意义片段（"unbelievable" → "un" + "believ" + "able"）。这样：
- 词表可控（几万级别）
- 没有 OOV（任何新词都能用已有 subword 拼出来）
- 序列长度合理

GPT、Claude、Llama 用的都是 BPE 或其变种，本质都是 subword tokenization。

---

## 主流算法是怎么工作的

### BPE (Byte Pair Encoding)

BPE 原本是 1994 年的数据压缩算法，Sennrich et al. 2015 用到 NLP ([arxiv 1508.07909](https://arxiv.org/abs/1508.07909))。训练过程：

1. 初始词表 = 所有字符
2. 统计语料中所有相邻 token pair 的频率
3. 把最高频的 pair 合并成一个新 token，加入词表
4. 重复 2-3，直到达到目标词表大小（如 50000）

举个例子。假设语料是：
```
low low low low low
lower lower
newest newest newest newest newest newest
widest widest widest
```

初始词表：`l, o, w, e, r, n, s, t, i, d, _`（_ 表示词尾）

最频繁的 pair 是 `(e, s)`（出现 9 次），合并成 `es`。下一轮 `(es, t)` 最频繁，合并成 `est`。继续到 `(l, o)` → `lo` → `low`。最终高频词被合成整体，低频词留作小片段。

**编码新文本时**：贪心地用最大长度的已有 token 去匹配。"lowest" → `low + est`。

### BPE 的两个变种

**Byte-level BPE (GPT-2 起)**：先把文本编码成 UTF-8 字节序列，再在字节上做 BPE。
- 优点：完全无 OOV，任何 Unicode 字符都能处理；初始词表固定 256
- 缺点：中文一个字 = 3 字节，要 3 个 token 才能表示一个汉字（如果该汉字没被合并成完整 token 的话）

**SentencePiece (Google)**：直接在原始文本上跑，不依赖预先的分词。把空格也当成普通字符（`▁` 表示），所以能无差别处理日语、中文这种没有空格的语言。Llama、T5、Qwen 都用 SentencePiece。

### Tiktoken (OpenAI)

OpenAI 自己的 Rust 实现，比 HuggingFace 的 tokenizer 快 3-6 倍。不是新算法，本质还是 BPE，但工程上做了大量优化。GPT-3.5/4/o 系列都用 `cl100k_base`（10 万词表），GPT-4o 升级到 `o200k_base`（20 万词表）。

可以在 [tiktokenizer.vercel.app](https://tiktokenizer.vercel.app/) 实时看分词结果。

---

## 实战：动手感受 tokenization

```python
import tiktoken

enc = tiktoken.encoding_for_model("gpt-4o")  # 用 o200k_base

# 1. 中英文 token 数对比
en = "I love machine learning"
zh = "我爱机器学习"

print(f"英文 {len(en)} 字符 → {len(enc.encode(en))} tokens")
# 英文 23 字符 → 5 tokens

print(f"中文 {len(zh)} 字符 → {len(enc.encode(zh))} tokens")
# 中文 6 字符 → 6 tokens（gpt-4o 已优化中文，老模型可能 12+ tokens）

# 2. 看具体怎么切的
for tok_id in enc.encode("strawberry"):
    print(tok_id, repr(enc.decode([tok_id])))
# 496 'st'
# 1158 'raw'
# 19772 'berry'
# → 一共 3 个 token，模型看到的是 3 个 "块"，根本数不到 3 个 r

# 3. 同样的中文在不同模型上
text = "人工智能的发展速度令人惊叹"

for model in ["gpt-3.5-turbo", "gpt-4o"]:
    n = len(tiktoken.encoding_for_model(model).encode(text))
    print(f"{model}: {n} tokens")
# gpt-3.5-turbo: 22 tokens
# gpt-4o: 9 tokens  ← 中文优化了 2.4 倍

# 4. Qwen 用 SentencePiece，对中文更友好
from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-7B")
print(len(tok.encode(text)))   # 通常 6-8 tokens，跟字数接近
```

跑一遍这段你会有几个直觉上的冲击：
- "strawberry" 只有 3 个 token——模型看到的根本不是字母序列，是 3 个不可分的"语义块"
- 中文成本随模型不同差几倍——选错模型，同样的服务费可能贵 2-3 倍
- 一个汉字 ≠ 一个 token，且不同 tokenizer 差异巨大

---

## 常见陷阱

### 陷阱 1：用字符数估算 token 数

经验值（仅供粗算）：
- 英文：1 token ≈ 4 字符 ≈ 0.75 个单词
- 中文（GPT-4o）：1 token ≈ 1.5 汉字
- 中文（老 GPT-3.5）：1 token ≈ 0.5 汉字（一个汉字要 2 个 token）

但**这些只是平均值**。一段密集的代码可能 1 token ≈ 2 字符；一段全是罕见专有名词的文本可能 1 token ≈ 0.5 字符。生产环境千万不要用字符数估算成本，必须实际跑 tokenizer。

### 陷阱 2：以为 "strawberry 有几个 r" 是模型变笨了

这是 tokenization 的结构性问题，不是智能问题。模型看到的 strawberry 是 `[st][raw][berry]` 三个不透明 ID，要回答"有几个 r"它需要：
1. 知道每个 token 内部包含的字符
2. 数清楚总数

第 1 步它从训练数据里推断（看过"r 在 raw 里出现 1 次"之类的间接信号），不稳定。**让模型先把单词拆成单字符再数（"strawberry: s-t-r-a-w-b-e-r-r-y"），准确率立刻拉满**。这是个经典的 prompt engineering 技巧。

### 陷阱 3：训练和推理用不同 tokenizer

模型的 embedding 层、LM head 都是按训练时词表训练的。如果推理时换 tokenizer：同样的文字编码出来的 token ID 不一样，模型输入完全错乱，输出乱码。

实战中容易踩这个坑的场景：自己 fine-tune 模型时图省事换了 tokenizer，或者从 HuggingFace 下载模型时漏下载 `tokenizer.json`。**永远从同一个目录加载 model 和 tokenizer**。

### 陷阱 4：忽视 "context length" 是 token 数不是字符数

API 报错 `context length exceeded` 时第一反应是"我字符数没超啊"——但 128K context 是 128K **token**。中文场景下，老模型 128K token 约 25 万字、新 GPT-4o 约 45 万字。预估字数时按 token 数 ÷ 0.5（保守）或 ÷ 1.5（GPT-4o）。

### 陷阱 5：以为"分得越细越好"

按字节切（vocab=256）确实最通用、零 OOV。但同样语义的序列长度变成 4-10 倍。每多一个 token 都要算一次 attention，自回归生成时每多一个 token 都要做一次完整 forward。**token 数翻倍 → 训练成本翻倍 + 推理速度减半 + KV Cache 翻倍**。所以 subword 是公认的甜点。

---

## 三种 tokenizer 横向对比

| 算法 | 代表用户 | 优点 | 缺点 | 适合 |
|---|---|---|---|---|
| **BPE (byte-level)** | GPT 系列、Claude | 零 OOV、词表统一 | 中文等多字节语言 token 数多 | 英文为主 |
| **SentencePiece** | Llama、T5、Qwen、Gemma | 不依赖预分词、多语言友好 | 实现稍复杂 | 多语言 |
| **WordPiece** | BERT 系列 | 训练算法略不同（贪心 vs 频率） | 已少见，被 BPE 取代 | 老模型 |
| **Tiktoken** | GPT-3.5/4/4o | 同 BPE，但 Rust 实现快 3-6 倍 | 仅 OpenAI 模型可用 | 工程效率 |

中文用户实测体感：
- **GPT-3.5 / GPT-4（cl100k_base）**：中文偏贵，1 字 ≈ 2 token
- **GPT-4o（o200k_base）**：明显优化，1 字 ≈ 0.7 token
- **Claude**：跟 GPT-4o 差不多
- **Qwen / DeepSeek**：用 SentencePiece，中文最优，1 字 ≈ 0.6 token

API 计费看 token 数，所以**同样内容用国产模型可能比国外便宜得多——不光因为单价，还因为 token 数本身就少**。

---

## 面试题深度解析

### Q: 为什么 GPT-4 数不清 strawberry 有几个 r？

**30 秒版本**：因为 GPT-4 看到的不是字母 "s-t-r-a-w-b-e-r-r-y"，而是 token ID `[496, 1158, 19772]`（"st", "raw", "berry"）。这三个 token 对模型来说是不透明的整体——它无法直接观察每个 token 内部有几个 r。要回答这个问题，模型只能从训练数据中间接推断"raw 含 1 个 r、berry 含 2 个 r"，这种推断不可靠。

**追问 1**：那 Claude / Gemini / Qwen 是不是也数不清？
本质都一样，所有基于 BPE/SentencePiece 的模型都有这个问题，只是程度不同。专门做过 character-level reasoning RLHF 训练的模型（如某些推理模型）会好一些，但底层 tokenization 决定了上限。

**追问 2**：怎么让模型答对？
最简单的 prompt 技巧：让模型先把单词拆成单字符再数。
```
"请把 strawberry 写成空格分隔的字母，然后数 r 的个数：
s t r a w b e r r y → r 在位置 3, 8, 9 → 共 3 个"
```
准确率立刻接近 100%。这个 prompt pattern 也适用于其他"细粒度字符操作"任务。

### Q: 同一段中文，老 GPT-3.5 和 GPT-4o 算出来 token 数差几倍。为什么？

**30 秒版本**：tokenizer 不同。GPT-3.5/4 用的 `cl100k_base` 词表只有 10 万，中文常用字大多没被单独收录，要 2-3 个 token 才能表示一个汉字。GPT-4o 用的 `o200k_base` 扩到 20 万，专门加了大量中文 token，常用汉字基本一个 token 一个，所以中文成本大幅下降。这也是 GPT-4o 在中文场景比 GPT-4 便宜的核心原因之一（除了单价更低）。

**追问**：那为什么不一开始就给中文做大词表？
两个原因：(1) 训练 GPT-3 时主要语料是英文，中文占比小，给中文分太多词表槽位浪费；(2) 词表大小直接影响 embedding 和 LM head 的参数量——词表从 10 万扩到 20 万，这两个矩阵的参数量各翻倍，对大模型来说是 GB 级的额外参数。OpenAI 在 GPT-4o 时做这个升级，是因为非英语用户成了主要付费方，商业上值得。

### Q: tokenizer 训练完之后能不能改？比如加新词？

**30 秒版本**：技术上可以加（HuggingFace 提供 `tokenizer.add_tokens()`），但模型几乎没法立刻用——新 token 在 embedding 矩阵和 LM head 里都是随机初始化的，没经过训练。要让新 token 真正生效，得 fine-tune 至少 embedding 层让它学到合理的表示。所以生产里**永远不要轻易给已训练好的模型加 token**。

**追问**：那怎么处理高频出现的专有名词（公司名、产品名）？
两种现实选择：(1) 接受模型把它拆成多个 subword，反正大模型 in-context 一次就能学会这个组合；(2) 如果真的极高频，做一次 continual pre-training，专门 fine-tune 让模型学会新词。多数场景选 (1) 就够了——LLM 的 in-context learning 强大到不需要为单个词改 tokenizer。

---

## 延伸阅读

- **论文：Neural Machine Translation of Rare Words with Subword Units** ([arxiv 1508.07909](https://arxiv.org/abs/1508.07909))
  Sennrich et al. 2015，把 BPE 引入 NLP 的开山论文。读它是为了理解 BPE 算法的 motivation——解决神经机器翻译的 OOV 问题。

- **代码：tiktoken** ([github.com/openai/tiktoken](https://github.com/openai/tiktoken))
  OpenAI 官方 tokenizer，Rust 实现 Python 绑定。读 README 就能掌握用法，深入想看实现可以读 `src/lib.rs`，BPE 编码的高效实现非常优雅。

- **工具：Tiktokenizer 在线可视化** ([tiktokenizer.vercel.app](https://tiktokenizer.vercel.app/))
  可以实时看任何文本被各种 tokenizer 切成什么样。debug 成本估算、看为什么某个 prompt 比预期贵时神器。

- **博客：Let's build the GPT Tokenizer** ([karpathy 视频](https://www.youtube.com/watch?v=zduSFxRajkE))
  Karpathy 两小时手撸 BPE，从头讲到所有边界情况（中文、emoji、special token）。看完会对 tokenizer 内部彻底通透。

- **论文：SentencePiece** ([arxiv 1808.06226](https://arxiv.org/abs/1808.06226))
  Kudo & Richardson 2018。读它是为了理解为什么多语言模型都用 SentencePiece——它把"分词"这一步也变成可学习的，对没有空格的语言（中日韩）特别友好。
