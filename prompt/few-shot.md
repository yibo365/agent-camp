---
title: 少样本学习 Few-shot
description: 不靠 fine-tune 也能教会模型新任务——在 prompt 里塞几个示例就行。但选示例、排示例本身就是一门学问。
pageClass: prompt-few-shot-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">Prompt 工程</p>
  <h1>Few-shot Learning 少样本学习</h1>
  <p class="doc-hero__lead">不靠 fine-tune 也能教会模型新任务——在 prompt 里塞几个示例就行。但选示例、排示例本身就是一门学问。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：Prompt 进阶</span>
    <span>核心机制：In-context Learning</span>
    <span>面试重点：示例选择 + 顺序效应</span>
  </div>
</section>

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>Few-shot 为什么 work？模型不是没更新参数吗？</strong>
    <span>考对 in-context learning 涌现机制的理解。</span>
  </div>
  <div>
    <strong>0-shot、Few-shot、Fine-tune 三者的边界在哪？什么场景选哪个？</strong>
    <span>考工程决策能力。</span>
  </div>
  <div>
    <strong>示例数量从 1 增到 5 收益最大，再加效果几乎不变。为什么？</strong>
    <span>考你跟得上 2022 后的实证发现。</span>
  </div>
  <div>
    <strong>Few-shot 示例的顺序会显著影响输出，为什么？</strong>
    <span>考对 recency bias 的认知。</span>
  </div>
  <div>
    <strong>选示例时应该选"和当前输入最相似的"还是"最有代表性的"？</strong>
    <span>考动态 few-shot vs 静态 few-shot 的差异。</span>
  </div>
  <div>
    <strong>示例标签写错了（故意写反），模型表现会怎样？</strong>
    <span>考你知不知道 Min et al. 2022 那篇反直觉的论文。</span>
  </div>
  <div>
    <strong>推理模型（o1、R1）还需要 few-shot 吗？</strong>
    <span>考新趋势，2024 后推理模型 few-shot 反而有害。</span>
  </div>
</div>

---

## 为什么需要 Few-shot

考虑一个任务：把用户的口语化日期表达转成 ISO 格式。

**Zero-shot prompt**：
```
"把下面这句话里的日期提取出来，转成 YYYY-MM-DD 格式：
'下周三我有个会'"
```

模型可能回答：
- "下周三" → 它不知道"今天"是哪天，可能瞎猜
- 格式可能给 "2026-06-10" 也可能给 "06/10/2026"
- 也可能解释一通最后没给 ISO 格式

**Few-shot prompt**：
```
"把口语化日期表达转成 YYYY-MM-DD 格式。今天是 2026-05-31。

输入: 明天
输出: 2026-06-01

输入: 下周一
输出: 2026-06-08

输入: 三天后
输出: 2026-06-03

输入: 下周三我有个会
输出:"
```

模型输出："2026-06-10" — 格式严格、参考点明确。

**Few-shot 的本质：用 (输入, 输出) 对儿告诉模型"我想要的就是这样"**——比任何文字描述都精准。这是 GPT-3 论文 ([Brown et al. 2020](https://arxiv.org/abs/2005.14165)) 的核心发现，开启了 in-context learning 时代。

---

## 核心原理：In-Context Learning

Few-shot 之所以 work，是因为大模型涌现了 **In-Context Learning (ICL)** 能力——**在不更新参数的前提下，从 prompt 里的示例"现学现用"**。

机制层面（学术界仍在研究）：
- **隐式梯度下降假说**：transformer 的 attention + FFN 实际上在 in-context 模拟了一次梯度下降，把 few-shot 示例当成 "mini-train set"
- **任务定位假说**：示例帮模型"识别"出当前要做什么任务（任务空间巨大，定位是关键）
- **格式锁定假说**：示例固定了输出格式，模型只需补完内容

无论哪种解释，**实验事实**很清楚：
- 模型规模越大，ICL 越强
- 在 GPT-2 之前，ICL 几乎不存在
- 在 GPT-3 (175B) 之后，ICL 成为大模型的标志能力

---

## 三种学习范式的对比

| 范式 | 怎么"教" | 训练成本 | 推理成本 | 适合 |
|---|---|---|---|---|
| **Zero-shot** | 只给指令 | 0 | 低（短 prompt） | 模型已会的标准任务 |
| **Few-shot** | 指令 + 几个示例 | 0 | 中（prompt 长） | 自定义格式 / 边缘任务 |
| **Fine-tune** | 用千万条数据训练 | 高（GPU 时） | 低（短 prompt） | 高频固定任务 |

**决策树**：
1. 大模型 zero-shot 试一下 → 行就用，省事
2. 不行就 few-shot（加 3-5 个示例）→ 80% 任务这步搞定
3. 还不行 + 调用量大 → fine-tune
4. 还不行 + 调用量小 → 换更强的模型或拆解任务

**关键 insight**：Few-shot 是 "**几乎免费的 fine-tune**"——零训练成本，立刻生效，可以快速迭代。Fine-tune 适合"任务稳定、调用量大、prompt 想压缩"的场景。

---

## 示例选择：选什么、选几个

### 数量：3-5 个是黄金区间

经验法则：
- **0 个**：标准任务直接试
- **1 个 (one-shot)**：让模型理解输出格式即可
- **3-5 个**：覆盖主要 case，效果跃升最大
- **8-16 个**：复杂任务可以试，但收益递减
- **> 20 个**：很少有更多收益，且 prompt 变长拖累延迟和成本

**为什么 5 个之后收益递减？** 因为 5 个示例已经能让模型识别出任务模式 + 输出格式。再加更多只是冗余覆盖，模型并不会"学得更准"。

### 选哪些示例

**静态 few-shot**（固定一组示例）：
- 优点：简单、稳定、缓存友好（同样 prompt 前缀可以复用 KV Cache）
- 缺点：对差异大的输入覆盖不全

**动态 few-shot**（根据当前输入选示例）：
- 用 embedding 检索：把输入和示例库都嵌入，选最相似的 K 个
- 用启发式选择：按主题、领域、长度分类后选
- 用 LLM 自选：让另一个 LLM 判断"这个输入和哪些示例最像"

**实战推荐**：
- 任务输入多样性低 → 静态 5 个精心挑选的示例
- 任务输入多样性高（如客服多领域）→ 动态检索 + 维护示例库

### 动态 few-shot 的实现

```python
from sentence_transformers import SentenceTransformer
import numpy as np

embedder = SentenceTransformer("BAAI/bge-large-zh-v1.5")

# 示例库（生产里几百到几千条）
examples = [
    {"input": "明天", "output": "2026-06-01"},
    {"input": "下周一", "output": "2026-06-08"},
    {"input": "下个月 5 号", "output": "2026-07-05"},
    {"input": "三天后", "output": "2026-06-03"},
    {"input": "本月最后一天", "output": "2026-05-31"},
    # ... 上百个
]

# 离线：把所有示例 input 嵌入
example_vecs = embedder.encode([e["input"] for e in examples], normalize_embeddings=True)

def select_examples(query, k=3):
    q_vec = embedder.encode([query], normalize_embeddings=True)
    scores = (q_vec @ example_vecs.T)[0]
    top_k = np.argsort(-scores)[:k]
    return [examples[i] for i in top_k]

def build_prompt(query):
    selected = select_examples(query, k=3)
    shots = "\n".join(f"输入: {e['input']}\n输出: {e['output']}" for e in selected)
    return f"""把口语化日期转成 YYYY-MM-DD。今天是 2026-05-31。

{shots}

输入: {query}
输出:"""
```

效果：动态 few-shot 比静态平均能提升 5-15 个百分点（特别是长尾输入）。

---

## 示例顺序：被低估的细节

**反直觉**：示例的顺序会显著影响输出，差距能到 10+ 百分点。

研究发现 ([Lu et al. 2022](https://arxiv.org/abs/2104.08786)) — 同样 4 个示例，4! = 24 种排列，在某些任务上 accuracy 最高和最低差距能达到 30%。

为什么？两个机制：
1. **Recency bias**：模型对 prompt 末尾的示例注意力最高（接近"要预测"的位置）
2. **Label distribution bias**：如果末尾几个示例都是同一类别，模型倾向于把当前输入也预测成这一类

**实战策略**：
1. **最重要 / 最难的示例放最后**——让它对模型影响最大
2. **标签均衡**——分类任务时确保 K 个示例的标签分布均匀
3. **难度递增**——简单的放前面、复杂的放后面（类比人类学习）
4. **同一 batch 内打乱**——对每个请求随机排列示例，减少偏差

### 不要把所有同类示例聚在一起

**反例**（分类任务的烂排列）：
```
输入: ... → 输出: 正面
输入: ... → 输出: 正面
输入: ... → 输出: 正面
输入: ... → 输出: 负面
新输入: ...
```
模型看到末尾是"负面"，会倾向于预测当前也是负面。**应该交错排列**：
```
输入: ... → 输出: 正面
输入: ... → 输出: 负面
输入: ... → 输出: 正面
输入: ... → 输出: 负面
新输入: ...
```

---

## 反直觉的研究发现

### 发现 1: 示例标签写错了，模型仍能工作（部分）

Min et al. 2022 *Rethinking the Role of Demonstrations* ([arxiv 2202.12837](https://arxiv.org/abs/2202.12837)) 做了一个惊人实验：**故意把示例的标签随机化**（把正面的标成负面、反之亦然），模型表现只下降几个百分点，远没崩。

含义：**Few-shot 的核心价值不是"教模型 input→output 映射"，而是让模型"识别任务格式 + 输入空间 + 输出空间"**。具体的 input-output 对应关系，模型更多依靠预训练里学到的世界知识，而不是 in-context 示例。

实战启示：
- 不要花太多力气追求"完美的标注示例"——格式正确就行
- 但**示例不能完全瞎写**——输入要真实、格式要正确、类别覆盖要全

### 发现 2: 示例多样性比"准确度"更重要

同样 5 个示例，覆盖 5 种不同输入风格 > 5 个相似的高质量示例。**多样性帮模型建立"输入空间地图"**——它知道任务边界有多广。

### 发现 3: Few-shot 在推理模型上反而有害

OpenAI 官方文档（[OpenAI Cookbook - reasoning best practices](https://cookbook.openai.com/examples/o-series/reasoning_for_data_validation)）和 Anthropic 文档明确建议：**o1/o3、Claude Thinking、DeepSeek-R1 等推理模型不要用 few-shot CoT**——这些模型已经内化了 CoT 推理过程，外部示例会干扰它们的思考。

正确做法：
- 推理模型：用清晰的 zero-shot + 必要时给 1 个示例展示格式
- 普通对话模型：3-5 个示例最稳

---

## 实战：完整的 few-shot prompt 模板

### 模板 1：分类任务

```python
SYSTEM = """你是一个客户反馈分类器。
把用户反馈分到以下类别之一：[功能问题, 体验问题, 价格抱怨, 表扬, 其他]
只输出类别名，不要任何额外文字。"""

PROMPT = """示例：

反馈: 今天又崩溃了，气死我了
类别: 功能问题

反馈: 界面太丑了，用着难受
类别: 体验问题

反馈: 谢谢客服，问题解决了！
类别: 表扬

反馈: 比同类产品贵一倍，性价比太低
类别: 价格抱怨

反馈: {user_feedback}
类别:"""
```

### 模板 2：抽取任务

```python
PROMPT = """从用户消息中抽取订单号和产品名，输出严格 JSON。

示例：

消息: 我订单 ABC-1234 的 iPhone 还没发货
输出: {"order_id": "ABC-1234", "product": "iPhone"}

消息: 退货问题，单号 XYZ-9876，关于那款蓝牙音箱
输出: {"order_id": "XYZ-9876", "product": "蓝牙音箱"}

消息: 没收到订单 DEF-5555 里的 AirPods 和保护套
输出: {"order_id": "DEF-5555", "product": "AirPods, 保护套"}

消息: {user_message}
输出:"""
```

### 模板 3：风格转换

```python
PROMPT = """把技术性描述改写成给非技术用户看的通俗版本。

原文: 系统因为 deadlock 在并发写入时崩溃了
通俗版: 因为多个用户同时修改数据，系统打架了，导致服务暂时不可用

原文: API rate limit exceeded due to 429 too many requests
通俗版: 您操作太频繁了，请稍等一分钟再试

原文: {tech_description}
通俗版:"""
```

---

## 常见陷阱

### 陷阱 1：示例和真实输入分布差距太大

示例都是 5 字短句，真实输入是 200 字长文——模型容易"对不上号"。**示例必须代表真实输入的分布**——长度、复杂度、用词风格都要接近。

### 陷阱 2：输出格式不一致

```
示例 1 输出: 类别: 正面
示例 2 输出: 类别：正面     ← 中文冒号
示例 3 输出: 正面          ← 没有"类别"前缀
```
模型不知道你到底要什么格式，输出五花八门。**所有示例输出格式必须严格一致**，包括标点。

### 陷阱 3：Few-shot 示例占满了 context window

5K token 的示例 + 100K token 的文档 = 模型注意力被严重分散。长上下文场景下：
- 减少示例数量（1-2 个就够）
- 或者把示例放在末尾（更接近 query）

### 陷阱 4：缓存不友好的动态 few-shot

动态选示例 → prompt 每次都不一样 → KV Cache 无法复用 → 延迟和成本上升。

折中方案：**前面固定 3 个静态示例（命中 prefix cache）+ 后面动态加 2 个个性化示例**。详见 [推理优化 - prefix caching](../llm/inference-optimization)。

### 陷阱 5：用 few-shot 替代 fine-tune

如果一个任务调用量极大（日百万次）+ 任务高度固定，**fine-tune 是更优解**：
- few-shot 每次推理都消耗示例 token，成本累加
- fine-tune 一次性把模式训进权重，prompt 大幅缩短，长期成本远低

转折点经验值：日调用量 > 10 万 + 任务稳定，就该考虑 fine-tune 了。

### 陷阱 6：忽视 few-shot 的"过拟合"

如果你的示例都是"正面情感"，模型可能把所有边界 case 都判成正面。**示例必须覆盖类别分布**，包括少数类。

---

## 面试题深度解析

### Q: Few-shot 不更新参数为什么能 work？模型在示例上"学"什么？

**30 秒版本**：Few-shot 的本质不是让模型"学映射"，是让模型"识别任务"。大模型预训练时已经见过数亿种任务模式，给它几个示例相当于在巨大的任务空间里"定位"——告诉它"这是分类任务、输入是 X 风格、输出是 Y 格式、类别空间是 Z"。具体的 input → output 映射，模型主要依靠预训练知识完成，示例只是"任务说明书"。这也解释了为什么 Min 2022 论文里"标签写错"也只掉几个点——任务定位的信号没变。

**追问**：那 Few-shot 的能力上限在哪？
两个层面：(1) **任务必须在预训练分布内**——如果是模型完全没见过的新任务（如某种专有领域逻辑），few-shot 帮不了多少，必须 fine-tune；(2) **示例数量收益有边界**——5-10 个之后基本饱和，更多示例只是冗余。所以 few-shot 的 sweet spot 是"模型大致会做的任务，需要 nudge 到正确格式"——这覆盖了 80% 的实际场景。

### Q: 示例顺序会影响输出，怎么应对？

**30 秒版本**：根因是模型的 recency bias——末尾示例对预测影响最大。三个对策：(1) **最关键/最难的示例放最后**——让它对模型影响最大；(2) **分类任务确保标签均衡分布**——不要把同类示例聚在一起，特别是末尾；(3) **生产里每次请求随机排列示例**——多次调用平均化偏差。Lu et al. 2022 论文实测，同样 4 个示例，最好和最差排列在 SST-2 任务上 accuracy 差 30%——这不是可以忽略的。

**追问**：那有没有自动找最优排列的方法？
有。同篇论文提出用一个"探针 prompt"评估每种排列的"自信度"（基于模型对正确答案的概率），选最高的。生产里这套机制叫 *prompt ordering*，工程上可以用以下简化版：(1) 准备 K! 种排列；(2) 在一个小验证集上跑每种排列，取 accuracy 最高的；(3) 用这个排列上线。比纯随机能提 5-10 个百分点。

### Q: 推理模型为什么不要 few-shot？

**30 秒版本**：推理模型（o1、R1、Claude Thinking）内部已经做了大量"思考过程展开"——它们的训练目标就是"给一个 prompt，先生成 CoT 再给答案"。给它们 few-shot 示例，等于在"思考前"先塞一堆样例，反而打乱模型的内部推理路径。OpenAI 官方建议：推理模型用 zero-shot + 简洁清晰的任务描述，最多给 1 个示例展示输出格式。

**追问**：那推理模型完全不需要示例吗？特殊格式怎么办？
特殊输出格式（如复杂 JSON schema）还是需要示例展示，但 **只展示格式、不展示推理过程**。比如：
```
请按以下格式输出：
{
  "answer": "...",
  "confidence": 0-1
}
```
对推理模型来说，这种"仅格式示范"是 OK 的，但不要给"详细解题步骤示例"——会干扰它的内部推理。

### Q: 动态 few-shot vs 静态 few-shot，怎么选？

**30 秒版本**：静态 few-shot 简单稳定、缓存友好（prefix caching 命中率高）、适合任务输入分布窄的场景；动态 few-shot 适配性强、长尾输入效果好、但每次 prompt 不同没法缓存。生产中常见的中庸做法是**"前面固定 + 后面动态"**——前 3 个示例固定（命中 prefix cache，节省 latency 和成本），后 1-2 个动态选（针对当前 query 个性化），鱼和熊掌兼得。

**追问**：动态示例库会越积越大，怎么管理？
三个机制：(1) **定期评估** —— 用业务评估集回归测，剔除"加入后反而拉低准确率的示例"；(2) **去重**——embedding 相似度高的示例只保留一个（避免冗余）；(3) **覆盖度监控** —— 跟踪示例库对真实输入分布的覆盖率，发现"长尾场景没示例覆盖"时主动添加。示例库本质上是一个"准训练集"，要按训练集的标准来管理。

---

## 延伸阅读

- **论文：Language Models are Few-Shot Learners (GPT-3)** ([arxiv 2005.14165](https://arxiv.org/abs/2005.14165))
  Brown et al. 2020。开启 in-context learning 时代的论文。读它是为了看"175B 模型涌现 ICL 能力"这个里程碑式的实证发现。

- **论文：Rethinking the Role of Demonstrations** ([arxiv 2202.12837](https://arxiv.org/abs/2202.12837))
  Min et al. 2022。读它是为了破除"few-shot 是在学 mapping"的误解——它告诉你示例的真正作用是"任务定位"。

- **论文：Fantastically Ordered Prompts** ([arxiv 2104.08786](https://arxiv.org/abs/2104.08786))
  Lu et al. 2022。读它是为了认识"示例顺序"这个被严重低估的变量——4! = 24 种排列差距能到 30%。

- **博客：Lilian Weng — Prompt Engineering** ([lilianweng.github.io/posts/2023-03-15-prompt-engineering/](https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/))
  OpenAI 出来的 Lilian Weng 的综述博客。读它是为了一篇文章覆盖 prompt 工程的所有主流技术，质量极高。

- **OpenAI Cookbook：Few-shot examples** ([cookbook.openai.com](https://cookbook.openai.com/))
  搜 "few-shot"，OpenAI 官方有大量实战示例。可以直接复制改用。
