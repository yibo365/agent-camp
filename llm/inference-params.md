---
title: 推理参数详解
description: temperature、top_p、top_k、penalty 这些参数到底在调什么——理解后能给具体场景挑出正确的解码策略。
pageClass: llm-inference-params-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">大模型基础</p>
  <h1>推理参数详解</h1>
  <p class="doc-hero__lead">temperature、top_p、top_k、penalty——这些调"创造力"的旋钮，调错一档输出就走样。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：LLM 工程实战必读</span>
    <span>核心链路：采样策略 + 重复抑制</span>
    <span>面试重点：参数语义 + 场景配方</span>
  </div>
</section>

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>temperature 是怎么影响输出的？数学上做了什么？</strong>
    <span>考底层机制，不能只会背"越高越随机"。</span>
  </div>
  <div>
    <strong>temperature=0 真的能保证完全确定输出吗？</strong>
    <span>陷阱题，"理论上是"但生产里几乎做不到。</span>
  </div>
  <div>
    <strong>top_p 和 top_k 区别是什么？同时设会怎样？</strong>
    <span>考混合采样的实际效果。</span>
  </div>
  <div>
    <strong>presence_penalty 和 frequency_penalty 各自惩罚什么？</strong>
    <span>考你能不能讲清这俩的细微差别。</span>
  </div>
  <div>
    <strong>RAG 场景应该用什么参数？创意写作呢？代码生成呢？</strong>
    <span>考场景配方，区分纸上知识和实战。</span>
  </div>
  <div>
    <strong>为什么有时候降 temperature 反而出现重复循环？</strong>
    <span>考对 greedy decoding 失败模式的认知。</span>
  </div>
  <div>
    <strong>seed、logprobs、logit_bias 这些参数什么时候用？</strong>
    <span>考进阶用法和 debug 能力。</span>
  </div>
</div>

---

## 为什么需要采样参数

每一步 LLM 推理，模型实际输出的不是"下一个 token"，而是**整个词表的概率分布**：

```
词表大小 50000
→ 模型输出 50000 个 logits
→ softmax → 50000 个概率（和=1）
→ 选一个作为下一个 token
```

最后这一步"选哪个"，就是采样参数控制的事。

**最简单的两个极端**：
- **Greedy decoding**：永远选概率最高的——确定但容易陷入死循环（"the the the the..."）
- **Pure sampling**：完全按概率采样——多样但可能选到很罕见的胡言乱语

实际生产用各种"折中策略"——既要避免胡言乱语，又要避免重复。temperature/top_p/top_k 就是这些折中策略的旋钮。

---

## 核心参数逐个拆解

### temperature：调"分布的锐度"

数学上 temperature 是 softmax 前给 logits 做的除法：

```python
import numpy as np

def softmax_with_temp(logits, temp):
    scaled = logits / temp
    exp = np.exp(scaled - scaled.max())   # 减最大值防溢出
    return exp / exp.sum()

logits = np.array([2.0, 1.0, 0.5, 0.1])

print(softmax_with_temp(logits, temp=1.0))
# [0.52, 0.19, 0.12, 0.08]  原始分布

print(softmax_with_temp(logits, temp=0.5))
# [0.74, 0.10, 0.04, 0.01]  尖锐——最高的更突出

print(softmax_with_temp(logits, temp=2.0))
# [0.38, 0.23, 0.18, 0.12]  平缓——拉平差距
```

**直觉解释**：
- `temp → 0`：分布趋于 one-hot，等价于 greedy
- `temp = 1`：分布不变（原始模型分布）
- `temp → ∞`：分布趋于均匀，等价于完全随机选

**经验范围**：
- `0.0 - 0.3`：事实问答、代码生成、结构化输出
- `0.5 - 0.8`：通用对话、摘要、翻译
- `0.8 - 1.2`：创意写作、头脑风暴
- `> 1.2`：很少用，效果不可控

### top_p (nucleus sampling)：调"候选池大小"

只在累计概率达到 p 的最小集合里采样。例如 top_p=0.9：

```
按概率排序的候选：
A: 0.5  → 累计 0.5
B: 0.3  → 累计 0.8
C: 0.1  → 累计 0.9   ← 切到这里
D: 0.05 → 不考虑
E: 0.05 → 不考虑

只在 {A, B, C} 里按归一化概率采样
```

**为什么需要 top_p？**

模型分布有时是"长尾"的——前几个 token 概率很高，但有几百个低概率的"垃圾选项"。直接采样可能选到垃圾。top_p 把这些尾巴砍掉，保留有意义的候选。

**关键性质**：top_p 是**自适应**的——分布尖锐时候选少（可能只有 1-2 个），分布平缓时候选多。比固定数量的 top_k 更智能。

### top_k：调"固定候选池"

只在概率最高的 K 个里采样。比 top_p 笨——分布尖锐时也保留 K 个（可能强行加入垃圾），分布平缓时只保留 K 个（可能砍掉合理选项）。

**今天主流推荐 top_p（OpenAI、Anthropic 默认）**，top_k 多用于研究或特殊场景。

### temperature + top_p 同时设的顺序

OpenAI / 大多数推理框架的执行顺序：

```
logits
  → 除以 temperature（缩放）
  → softmax 转概率
  → top_p 裁掉尾巴
  → 在剩下的里采样
```

**实战配方**：
- 不要同时把 temperature 和 top_p 都调极端。`temp=0.7, top_p=0.9` 是黄金组合
- 想要确定性：`temp=0` 即可，top_p 失效
- 想要创造力：调高 `temp`，保持 `top_p=0.9-0.95` 防止采到垃圾

### presence_penalty 和 frequency_penalty

两个 -2.0 到 2.0 的参数，用来抑制重复。计算时直接修改 logits：

```python
# OpenAI 的实现（简化）
for token in already_generated:
    logits[token] -= presence_penalty   # 出现过就减（不管几次）
    logits[token] -= frequency_penalty * count(token)  # 出现越多减越多
```

**两者的区别**：
- `presence_penalty`：**只要出现过就惩罚**——对所有出现过的 token 减相同分数
- `frequency_penalty`：**按出现次数累加惩罚**——出现 1 次减 1×，出现 5 次减 5×

**使用场景**：
- 想让模型"换个话题"——用 presence_penalty
- 想让模型避免反复说同一个词——用 frequency_penalty
- 大多数场景两个都设 `0.3-0.5` 就够了，过高会让模型刻意找冷僻词，反而不自然

### max_tokens

生成的最大 token 数。**注意**：
- 不是字符数，是 token 数
- 包含在 `total_tokens` 里，按计费
- 设太小可能截断响应

### stop 序列

遇到指定字符串就停止生成。常见用法：
```python
stop = ["\n\n", "User:", "###"]
# 适合 few-shot prompt 防止模型续写下一个示例
```

### seed（OpenAI 等支持）

固定随机种子。理论上同样 seed + 同样参数 → 同样输出。**但实际上**——OpenAI 文档明确说"努力让输出确定但不保证"，因为后端硬件、批处理、动态路由都会引入非确定性。

### logprobs

返回每个生成 token 的 log 概率（以及 top-K 候选的概率）。用来：
- 计算困惑度（perplexity）
- 模型置信度评估
- 重排序生成结果

### logit_bias

直接给特定 token 的 logits 加偏移（-100 到 100）。用法：
```python
# 禁用某些词
logit_bias = {token_id_of("password"): -100}

# 强制偏向某些词
logit_bias = {token_id_of("Yes"): 5, token_id_of("No"): 5}
```

适合分类任务、约束输出格式。

---

## 不同场景的参数配方

### 配方 1：RAG 问答 / 事实回答
```python
temperature = 0.0  # 或 0.1
top_p = 1.0
frequency_penalty = 0.0
presence_penalty = 0.0
```
为什么：RAG 的目标是"从给定文档抽取答案"，不需要创造性。temperature=0 让模型选最可能的答案，最大限度避免幻觉。

### 配方 2：通用对话 / 客服
```python
temperature = 0.7
top_p = 0.9
frequency_penalty = 0.3
presence_penalty = 0.3
```
为什么：对话需要一定的自然变化，但要避免重复套话。frequency_penalty 防止模型反复用"非常感谢"、"很高兴帮您"这种模板。

### 配方 3：创意写作 / 头脑风暴
```python
temperature = 1.0   # 甚至 1.2
top_p = 0.95
frequency_penalty = 0.5
presence_penalty = 0.5
```
为什么：要的就是多样性。高 temp + 高 top_p 让模型大胆尝试，penalty 防止反复用同样的词。

### 配方 4：代码生成
```python
temperature = 0.2
top_p = 0.95
frequency_penalty = 0.0
presence_penalty = 0.0
```
为什么：代码有唯一正确写法的倾向，低 temp 减少错误。**但不是 0**——很多代码任务有多种合理解法，留一点随机性允许模型在选择间权衡。

### 配方 5：结构化输出（JSON、SQL）
```python
temperature = 0.0
top_p = 1.0
# 配合 response_format={"type": "json_object"} 或 function calling
```
为什么：结构化输出必须严格符合语法，任何随机性都是风险。OpenAI/Anthropic 都提供专门的 structured output 模式，比纯 temp=0 更可靠。

### 配方 6：摘要 / 翻译
```python
temperature = 0.3
top_p = 0.9
frequency_penalty = 0.0
presence_penalty = 0.0
```
为什么：忠实度比创造性重要，但完全 greedy 可能输出不流畅。0.3 是稳定流畅的甜点。

---

## 常见陷阱

### 陷阱 1：以为 temperature=0 输出完全确定

理论上 greedy decoding 是确定的，但生产里几乎做不到：
- **浮点运算的非确定性**：GPU 上 reduce 操作（如 softmax 求和）顺序依赖 thread 调度，每次可能微小不同
- **批处理动态路由**：你的请求和别人的请求 batch 在一起，batch 大小影响数值结果
- **后端版本切换**：API 提供商悄悄换了底层硬件/模型版本

实测 OpenAI temp=0 同样 prompt 重复 100 次，大概 80-90% 完全一致，10-20% 有微小差异。**生产代码不要假设 temp=0 = 完全确定**。

### 陷阱 2：低 temperature 反而陷入重复

设 `temperature=0` 时，如果模型在某个上下文下，"the" 和 "and" 的概率几乎一样高（比如各 0.49），greedy 会永远选第一个——结果可能是 "the the the the..." 死循环。这种死循环在长生成时特别容易出现。

解法：
- 加 `frequency_penalty=0.3-0.5`
- 升一点 temp 到 0.2-0.3
- 用 beam search 替代 greedy（但 LLM 时代很少这么用了）

### 陷阱 3：把 temp 和 top_p 都拉满想要"超级创意"

`temp=2.0 + top_p=1.0` 不会让模型变成天才作家，只会让它输出胡言乱语——选到极低概率的 token，语法都崩。安全的"creative"配置是 `temp=1.0 + top_p=0.95`，砍掉绝对垃圾的尾巴。

### 陷阱 4：penalty 设太高导致词汇怪异

`frequency_penalty=2.0` 会让模型为了避免重复，强行使用冷僻同义词。"the cat sat on the mat" 可能变成 "yon feline rested upon said carpet"——语法对，但读起来怪异。

实战：penalty 极少超过 0.6。

### 陷阱 5：忘了 system prompt 也算 token

`max_tokens` 限制的是**生成**的 token 数。但 context window（如 128K）限制的是**输入 + 输出**总和。如果 system prompt + 对话历史 + 用户问题 + RAG context 已经占了 127K，那 max_tokens 最多只能 1K——再大也没用。

### 陷阱 6：所有场景一套参数

不同业务场景的最佳参数差异很大。一个 RAG 场景 temp=0.7 可能幻觉飙升，一个创意场景 temp=0.0 可能毫无新意。**为每个业务场景跑一组小规模 A/B test 选参数**，是上线前必做的事。

---

## 面试题深度解析

### Q: temperature 数学上做了什么？

**30 秒版本**：temperature T 是 softmax 前给 logits 做的除法——`softmax(logits / T)`。T → 0 时 logits 被无限放大，最大值在 softmax 后趋于 1，其他趋于 0，分布退化成 one-hot（等价于 greedy）；T → ∞ 时 logits 被压缩到接近 0，softmax 输出趋于均匀分布，等价于完全随机。T = 1 时分布不变。

**追问**：为什么是除法不是减法？
因为 softmax 对乘性变换更敏感——logits 的相对比例决定概率比例。减法只会平移分布，softmax 后概率不变（softmax 对常数平移不变）。除法直接改变 logits 之间的相对差距，从而改变 softmax 分布的锐度。

### Q: presence_penalty 和 frequency_penalty 区别？什么时候用哪个？

**30 秒版本**：presence_penalty 是"出现过就扣固定分"，对所有已出现 token 减相同值；frequency_penalty 是"出现越多扣越多"，按出现次数加权。前者鼓励"换新话题/换新词"，后者鼓励"避免反复啰嗦同一个词"。日常对话两个都设 0.3 是稳妥的，要让模型主动开拓新内容用 presence、要让单词分布均匀用 frequency。

**追问**：那这两个能完全替代 deduplication 后处理吗？
不能。penalty 只在 token 层面工作，无法防止"语义重复"——比如模型先说"这是个好主意"再说"这真是个很棒的想法"——token 不重复但意思重复。语义重复要靠 prompt 设计或后处理（比如让另一个 LLM 检查再压缩）。

### Q: 为什么 RAG 用 temp=0，但 GPT 自由对话用 temp=0.7？

**30 秒版本**：本质上 temperature 是"在多大程度上信任模型的次优答案"。RAG 场景下答案是从给定文档抽取的，最高概率 token 就是从文档里抄来的对应词，次优 token 大概率是"偏离文档的脑补"——所以要 temp=0 严格选 top-1。自由对话场景下，最高概率 token 往往是模板套话（"作为一个 AI 助手..."），次优 token 才是真正信息——给一点随机性反而让回答更自然。

**追问**：那 reasoning model（如 o1）应该用什么 temp？
OpenAI 文档建议 o1 系列使用默认 temperature，且不要手动调——因为推理模型内部已经做了大量自我搜索，外部 sampling 干扰反而损害效果。这是推理模型和普通对话模型的关键差异：**推理模型把"采样多样性"内化为思考过程**，外部参数应该最小化干预。

### Q: seed 设了为什么还是不一致？

**30 秒版本**：seed 只能控制软件层面的随机数生成（采样时的随机抽取）。但 GPU 推理本身有硬件级非确定性——浮点 reduce 操作顺序、batch 动态拼接、CUDA kernel 调度都会引入微小差异。即使是同一台机器、同一个模型、同一个 seed，重复推理也只能保证大概 80-95% 完全一致。OpenAI 文档明确说 seed "best-effort 而非保证"。

**追问**：那真要追求 100% reproducible 怎么办？
理论方法：CUDA_LAUNCH_BLOCKING=1 + 固定 batch_size=1 + 禁用 cudnn_benchmark + 用 fp32（不用混合精度）。但这些会让推理慢 5-10 倍。生产里没人这么干，要 reproducible 通常的做法是**缓存 generation 结果**——同样 prompt 直接返回上次的输出，绕过模型推理。

---

## 延伸阅读

- **论文：The Curious Case of Neural Text Degeneration** ([arxiv 1904.09751](https://arxiv.org/abs/1904.09751))
  Holtzman et al. 2019。Nucleus sampling (top_p) 的原始论文。读它是为了理解"为什么 greedy 和 pure sampling 都不好"——这是所有现代采样策略的理论基础。

- **OpenAI 文档：Reproducibility & seed** ([platform.openai.com/docs/advanced-usage/reproducible-outputs](https://platform.openai.com/docs/advanced-usage/reproducible-outputs))
  官方说明 seed 的局限。读它是为了不踩"以为 seed 万能"的坑。

- **OpenAI 文档：Function Calling & Structured Outputs** ([platform.openai.com/docs/guides/structured-outputs](https://platform.openai.com/docs/guides/structured-outputs))
  结构化输出比纯 temp=0 更可靠的方法。生产 RAG/Agent 必读。

- **博客：How to generate text with HuggingFace** ([huggingface.co/blog/how-to-generate](https://huggingface.co/blog/how-to-generate))
  HuggingFace 官方科普文，用动图展示 greedy/beam/sampling 各种解码策略的差异。直观胜过任何文字解释。

- **代码：vLLM SamplingParams** ([docs.vllm.ai/en/latest/api/inference_params.html](https://docs.vllm.ai/en/latest/api/inference_params.html))
  vLLM 是当前最主流的开源 LLM 推理引擎，看它的 SamplingParams 文档能掌握所有参数的工业级实现。
