---
title: Prompt Compression 提示词压缩
description: 用 LLMLingua、token pruning 等技术把长 prompt 压到 1/3-1/5，省钱、降延迟、不掉效果——长上下文时代必备的工程手段。
pageClass: prompt-compression-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">Prompt 工程</p>
  <h1>Prompt Compression 提示词压缩</h1>
  <p class="doc-hero__lead">用 LLMLingua、token pruning 等技术把长 prompt 压到 1/3-1/5——省钱、降延迟、不掉效果，长上下文时代必备。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：成本/延迟优化</span>
    <span>核心：LLMLingua / 摘要 / KV Cache 复用</span>
    <span>面试重点：压缩 vs 长上下文模型的权衡</span>
  </div>
</section>

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>为什么需要 prompt compression？长上下文模型不就解决问题了吗？</strong>
    <span>考你能不能讲清"塞得下"和"用得好"是两回事。</span>
  </div>
  <div>
    <strong>LLMLingua 是怎么工作的？为什么用小模型就能给大模型压缩？</strong>
    <span>考压缩算法的底层机制。</span>
  </div>
  <div>
    <strong>LLMLingua 2 比 1 强在哪？</strong>
    <span>考你跟得上 2024 的最新进展。</span>
  </div>
  <div>
    <strong>除了 LLMLingua，还有哪些压缩方法？各自适合什么场景？</strong>
    <span>考方法论广度。</span>
  </div>
  <div>
    <strong>什么场景下不该压缩？压缩的常见 failure mode 是什么？</strong>
    <span>考边界认知。</span>
  </div>
  <div>
    <strong>Prompt compression 和 KV Cache、prefix caching 是替代关系还是互补？</strong>
    <span>考工程权衡。</span>
  </div>
  <div>
    <strong>怎么评估一个压缩方法的好坏？指标怎么定？</strong>
    <span>考评估方法论。</span>
  </div>
</div>

---

## 为什么需要 Prompt Compression

长 prompt 的隐性成本：

```
RAG Agent 典型 prompt 构成:
- System prompt: 1000 token
- Few-shot 示例: 500 token
- Chat history: 2000 token（多轮后）
- Retrieved documents: 5000 token（top-K chunks）
- User question: 100 token
─────────────────────────
合计: ~8600 token / 次请求
```

按 GPT-4o 定价（input $2.5/M token，output $10/M token）：
- 单次请求 input 成本：~$0.022（人民币 ~0.16 元）
- 日 100 万次请求：**~16 万元/天**
- 80% 的 token 是"上下文"，真正的用户问题只占 1%

**Prompt compression 的核心 idea**：上下文里有大量冗余 token——填充词、重复语义、辅助说明——压缩掉它们对模型理解几乎无影响，但 token 数能降 3-5 倍。

收益：
- **成本**：input token 直接减 60-80%
- **延迟**：prefill 阶段时间和 prompt 长度成正比，压缩后 prefill 快 3-5 倍（详见 [推理优化](../llm/inference-optimization)）
- **质量**：好的压缩算法效果几乎不掉，部分场景甚至因为减少噪声反而更好

---

## "长上下文"不能替代 Compression

2024 后主流模型上下文都到了百万 token（Gemini 2M、Claude 200K、GPT-4o 128K）。一个直觉问题：**既然能塞这么多，还需要压缩吗？**

需要。三个原因：

### 1. "塞得下"和"用得好"是两回事

Lost in the Middle ([Liu et al. 2024](https://arxiv.org/abs/2307.03172)) 发现：把答案放在 prompt 中间位置，模型准确率比放开头/末尾低 20%+。**长上下文越长，中间信息越被忽略**——压缩到精华更有效。

### 2. 成本和延迟仍然按 token 计费

长上下文模型不收"长 prompt 折扣"。塞 100K token 就是付 100K token 的钱、等 100K token 的 prefill 时间。**压缩是直接降钱降延迟**，长上下文只是"能跑"。

### 3. 长上下文场景下 KV Cache 爆炸

KV Cache 大小和序列长度成正比（详见 [Transformer](../llm/transformer)）。100K 上下文的 KV Cache 可能比模型权重还大。**压缩同时降低 KV Cache 占用**，让显存能跑更多并发。

**结论**：长上下文是基础设施升级，prompt compression 是应用层优化——两者互补，不替代。

---

## 主流压缩方法

### 方法 1: LLMLingua 系列（最主流）

微软 2023-2024 推出的 LLMLingua 是当前最成熟的 prompt compression 框架。

#### LLMLingua (v1)

Jiang et al. 2023 *LLMLingua* ([arxiv 2310.05736](https://arxiv.org/abs/2310.05736)) 的核心 idea：

**用一个小 LLM（如 LLaMA-7B）来评估每个 token 的"重要性"，删掉不重要的 token。**

具体流程：
1. 用小 LLM 计算 prompt 中每个 token 的 perplexity（不确定性）
2. perplexity 低的 token 是"可预测的、冗余的"（删了不影响理解）
3. perplexity 高的 token 是"信息量大的"（保留）
4. 按比例删除低 perplexity token

直觉解释：模型自己能"预测出"的词（如"the"、"of"、"is"），就算删掉，大模型读到上下文也能脑补回去——信息没有损失。

效果：典型场景压缩 3-5 倍，下游任务效果损失 < 5%。

#### LLMLingua-2 (v2)

Pan et al. 2024 *LLMLingua-2* ([arxiv 2403.12968](https://arxiv.org/abs/2403.12968)) 进一步改进：

**用一个专门训练的小分类器（BERT 级别）直接判断每个 token 是否该保留——比 v1 快 3-6 倍，且不依赖与目标 LLM 同源的小模型。**

关键改进：
- 不再依赖 perplexity（perplexity 计算需要 forward 整个小 LLM，慢）
- 用 token-level binary classifier，速度快很多
- 对中文、代码等场景适配性更好

实测：LLMLingua-2 是当前 prompt compression 的事实标准。

#### 用 LLMLingua 的代码

```python
# pip install llmlingua

from llmlingua import PromptCompressor

# 加载 LLMLingua-2 模型
llm_lingua = PromptCompressor(
    model_name="microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank",
    use_llmlingua2=True,
)

# 长 prompt
prompt = """你是一个高级数据分析师。你需要根据以下数据回答问题。
[5000 字的数据上下文...]

问题：哪个季度销售额最高？"""

# 压缩
result = llm_lingua.compress_prompt(
    prompt,
    rate=0.33,  # 压缩到原长度的 33%
    force_tokens=['\n', '?'],   # 强制保留这些 token
)

compressed = result["compressed_prompt"]
print(f"原长度: {result['origin_tokens']} tokens")
print(f"压缩后: {result['compressed_tokens']} tokens")
print(f"压缩比: {result['ratio']}x")

# 直接把 compressed 喂给 GPT-4o
response = openai_client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": compressed}]
)
```

LLMLingua 是开源的，自部署只需一张普通 GPU。

### 方法 2: 摘要式压缩（Summary-based）

让一个 LLM 先把长内容总结成短摘要，再用摘要做 prompt：

```python
# 多轮对话压缩历史
def compress_history(messages, llm):
    if len(messages) < 10:
        return messages

    old, recent = messages[:-4], messages[-4:]
    summary = llm.chat(f"""把以下对话总结成不超过 200 字的摘要，保留关键信息：

{format_messages(old)}""")

    return [
        {"role": "system", "content": f"以下是先前对话摘要：{summary}"},
        *recent
    ]
```

**优点**：
- 实现简单，不需要专门模型
- 适合多轮对话历史压缩
- 摘要可读，便于 debug

**缺点**：
- 多一次 LLM 调用，有延迟和成本
- 摘要可能丢失关键细节
- 不适合需要精确信息的场景（如 RAG 检索文档）

### 方法 3: 选择性检索 (Selective Retrieval)

RAG 场景的"特殊压缩"——通过更精准的检索减少喂给 LLM 的 chunks：

- 用 **reranker** 把 top-50 精排到 top-3-5（详见 [RAG - reranking](../rag/reranking)）
- 用 **MMR (Maximal Marginal Relevance)** 减少 chunk 之间冗余
- 用 **chunk summarization** 把长 chunk 总结成精简版

本质都是"减少喂给 LLM 的无关内容"，效果上等价于 prompt compression。

### 方法 4: KV Cache 复用（不是压缩但相关）

如果 prompt 的某些部分（如 system prompt、固定 few-shot 示例）跨请求重复，**prefix caching** 让这些部分的 KV Cache 在第二次请求时直接复用，省去 prefill 时间。

```python
# vLLM 启用 prefix caching
llm = LLM(model="...", enable_prefix_caching=True)
```

适合：
- 同一 system prompt 服务大量用户
- 同一 few-shot 模板用于不同 user query
- 多轮对话（前面历史的 KV 复用）

**这不是真正的"压缩"**（token 数不变），但效果上等同——减少了重复计算的成本。详见 [推理优化](../llm/inference-optimization)。

### 方法 5: Soft Prompt / Prompt Tuning（学习型压缩）

把 prompt 用少量"软 token"（学习出来的 embedding）替代——理论上能把数千 token 的 prompt 压到几十个。

代表方法：**Gisting** ([Mu et al. 2023](https://arxiv.org/abs/2304.08467))：训练一个模型把任意 prompt 编码成 10-20 个"gist token"，下游模型用这些 gist token 替代原 prompt。

**优点**：极致压缩比，几十倍。
**缺点**：需要训练、损失大、不通用。生产里很少用，更多是研究方向。

---

## 各种方法对比

| 方法 | 压缩比 | 实现复杂度 | 效果损失 | 适合场景 |
|---|---:|---|---|---|
| **LLMLingua-2** | 3-5× | 中（需要部署小模型） | < 5% | 长 RAG、长指令、固定文档 |
| **摘要式压缩** | 5-10× | 低（一次 LLM 调用） | 10-20% | 多轮对话历史 |
| **Selective Retrieval** | 5-20× | 中（reranker + MMR） | 5-15% | RAG 场景 |
| **Prefix Caching** | 不变（KV 复用） | 低（推理引擎开关） | 0% | system prompt + few-shot 固定 |
| **Soft Prompt** | 50-100× | 高（需训练） | 20-40% | 少见，研究为主 |

**实战推荐**：
- RAG 场景：Selective Retrieval（reranker + MMR）+ Prefix Caching（system 部分）
- 长对话：摘要式压缩（旧对话）+ Prefix Caching（system + 最近几轮）
- 长指令 / 文档：LLMLingua-2
- 复杂场景：组合使用

---

## 实战：RAG 场景的多层压缩

```python
from llmlingua import PromptCompressor
from sentence_transformers import CrossEncoder

llm_lingua = PromptCompressor("microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank", use_llmlingua2=True)
reranker = CrossEncoder("BAAI/bge-reranker-large")

def smart_rag(query, retrieved_chunks, top_k=3, compress_rate=0.5):
    # Step 1: 重排序，从粗召回的 50 个里精选 top_k
    pairs = [[query, c] for c in retrieved_chunks]
    scores = reranker.predict(pairs)
    top_chunks = [c for _, c in sorted(zip(scores, retrieved_chunks), reverse=True)[:top_k]]

    # Step 2: 用 LLMLingua 压缩每个 chunk
    compressed_chunks = []
    for chunk in top_chunks:
        result = llm_lingua.compress_prompt(
            chunk,
            rate=compress_rate,
            force_tokens=['\n', ':', '-']  # 保留结构标记
        )
        compressed_chunks.append(result["compressed_prompt"])

    # Step 3: 拼成最终 prompt
    context = "\n\n".join(compressed_chunks)
    return f"""根据以下文档回答问题。

文档:
{context}

问题: {query}"""
```

实测：从 50 个 chunks（5000 token）压到 top_3 + 50% 压缩（750 token），成本降 6-7 倍，质量保持 95%+。

---

## 常见陷阱

### 陷阱 1：压缩比设得太激进

```python
result = llm_lingua.compress_prompt(prompt, rate=0.1)  # 10% 压缩
```

压到 10% 经常会丢失关键信息。**经验值**：
- LLMLingua-2 安全压缩比：30%-50%（保留 30-50% token）
- 超过这个值要在评估集上严格测试

### 陷阱 2：在不该压缩的内容上压缩

不要压：
- **代码**：去掉一个 token 可能改变语义
- **JSON / 结构化数据**：破坏格式
- **数字、日期、ID**：稍变就错
- **用户最终问题**：模型需要原原本本理解

只压：
- 长指令的辅助说明
- 检索回来的文档正文
- 多轮对话的旧历史
- Few-shot 示例的解释部分

`force_tokens` 参数能强制保留特殊 token，但还是建议**先按内容类型决定是否压缩，而不是无差别压全部**。

### 陷阱 3：忘了评估压缩对下游任务的影响

不能光看"压缩比 5x"就上线——必须**在业务评估集上跑原 prompt 和压缩 prompt，对比下游任务准确率**。某些场景压缩 50% 完全无损，某些场景压缩 20% 就崩。

```python
def eval_compression(eval_set, compress_rate):
    scores_original, scores_compressed = [], []
    for case in eval_set:
        # 原 prompt
        out_orig = run_with_prompt(case["prompt"], llm)
        scores_original.append(judge(out_orig, case))

        # 压缩 prompt
        compressed = compress(case["prompt"], rate=compress_rate)
        out_comp = run_with_prompt(compressed, llm)
        scores_compressed.append(judge(out_comp, case))

    return {
        "avg_original": mean(scores_original),
        "avg_compressed": mean(scores_compressed),
        "loss": mean(scores_original) - mean(scores_compressed)
    }
```

### 陷阱 4：用压缩替代真正的优化

如果 prompt 长是因为"塞了一堆无关 few-shot"或"没做 retrieval rerank"——根本问题是**设计差**，不是压缩能解决的。先把 prompt 设计做对（详见 [基础原则](./basics) 和 [Few-shot](./few-shot)），实在还是长再考虑压缩。

### 陷阱 5：压缩破坏 prefix cache

如果你的 system prompt 命中 prefix cache（很多请求共享）——动态压缩 system prompt 会让每个请求的 prompt 都不一样，cache 全失效，反而更慢更贵。

**正确做法**：
- 固定部分（system、few-shot）：保持不变，靠 prefix cache 加速
- 动态部分（user query、retrieved docs）：才适合压缩

### 陷阱 6：忘了压缩本身的延迟

LLMLingua-2 压一次大约几十到几百毫秒（取决于长度）。**如果用户等不及这个时间，压缩反而拖慢首字延迟**。实时对话场景慎用，异步任务最适合。

---

## 评估压缩方法的指标

| 指标 | 计算 | 用途 |
|---|---|---|
| **压缩比** (Compression Ratio) | 原 token / 压缩后 token | 直接成本节省 |
| **下游任务准确率** | 评估集上跑原/压缩 prompt 对比 | 真实效果损失 |
| **延迟** (压缩 + 推理) | 压缩耗时 + 压缩后 prompt 推理耗时 | 端到端用户体验 |
| **可读性** | 人工评 | debug 友好度 |

**生产化决策框架**：

```
1. 在评估集上跑不同 compression_rate（10%, 30%, 50%, 70%, 100%）
2. 找到"准确率损失 < 业务可接受阈值（如 3%）"的最高压缩比
3. 对比压缩省下的成本 vs 压缩本身的延迟和复杂度
4. 决定是否上线 + 上线后持续监控
```

---

## 面试题深度解析

### Q: LLMLingua 为什么用小模型就能给大模型压缩？

**30 秒版本**：核心 insight 是——**"哪些 token 重要"这个判断不依赖于具体下游模型**。LLMLingua v1 用小 LLM 计算每个 token 的 perplexity，perplexity 低的（可预测的、冗余的，如"the"、"is"、连接词）删掉，perplexity 高的（信息密度高的，如数字、专有名词）保留。这个"信息密度"判断在大小模型间高度一致——小模型认为冗余的，大模型读了也能脑补回来。所以用小模型评估，给大模型用。LLMLingua-2 进一步用 BERT 级分类器代替 perplexity 计算，速度更快、效果更稳。

**追问**：那为什么不直接让大模型自己判断哪些 token 重要？
两个原因：(1) **成本**——让大模型再 forward 一遍判断每个 token 重要性，比直接用大模型回答还贵；(2) **没必要**——小模型已经足够准。这就是为什么 LLMLingua 的设计很优雅：用便宜的小模型做"裁剪决策"，用贵的大模型做"回答任务"——各司其职。这也是 ML 工程的经典模式（distillation、cascade、speculative decoding 都是这思路）。

### Q: 长上下文模型出来后，prompt compression 还有意义吗？

**30 秒版本**：有，而且更重要。三个原因：(1) **成本仍按 token 计费**——长上下文模型不收"长 prompt 折扣"，塞 100K 就付 100K 的钱；(2) **延迟仍随 prompt 长度增加**——prefill 时间和序列长度正相关，长 prompt 首字延迟 5-10 秒，用户等不了；(3) **Lost in the Middle**——长上下文越长，模型对中间信息越忽略，压缩到精华反而效果更好。长上下文是"能塞下"的基础设施升级，prompt compression 是"用得好 + 便宜 + 快"的应用层优化，两者**互补不替代**。

**追问**：那 Gemini 2M 上下文 + RAG 还需要切 chunk 吗？
仍需要。原因：(1) 即使能塞 2M token，效果会因 Lost in the Middle 受损；(2) 成本巨大（2M token GPT-4o 输入约 $5 一次）；(3) 延迟极长（prefill 几十秒到几分钟）；(4) KV Cache 显存爆炸（百 GB 级）。生产 RAG 仍然是 "chunk + 精排 + 压缩 + 喂给 LLM"，长上下文模型只是把"能塞的 chunk 数"提高了上限。

### Q: 什么场景下不该用 prompt compression？

**30 秒版本**：五类场景：(1) **代码**——一个 token 删了可能改变语义；(2) **结构化数据**（JSON / SQL / 表格）——破坏格式；(3) **数字 / 日期 / ID**——稍变就错；(4) **用户最终问题**——模型必须看原版；(5) **prefix-cached system prompt**——动态压缩会破坏缓存。可以压的：长指令的辅助说明、RAG 检索回的文档正文、多轮对话的旧历史、Few-shot 示例的解释部分。**核心原则：哪些内容"重新读也能脑补回来"，哪些"丢一个字就错"——前者可压，后者不能**。

**追问**：那压缩的安全策略怎么设计？
两层：(1) **白名单内容才压缩**——按内容类型分类，只对明确可压的部分压；(2) **离线验证 + 上线监控**——任何新压缩策略上线前在评估集上跑通；上线后持续监控压缩 prompt 的真实效果，发现回归立刻回滚。生产化的关键是把"压缩"当成可独立开关的优化，不要绑死在主流程里——这样发现问题能快速降级到无压缩模式。

### Q: 压缩、KV Cache、prefix caching 是替代关系吗？

**30 秒版本**：互补。三者优化不同层面：**压缩**减少 token 数（直接降单次成本和延迟）；**KV Cache**避免 decode 时重复算 attention（让生成快）；**Prefix Caching**让重复出现的 prompt 前缀复用已算好的 KV（让 prefill 快）。一个完整优化的 LLM 应用三者全用：(1) 系统 prompt 不变 → prefix cache 命中；(2) RAG 文档先 rerank 再 LLMLingua 压缩 → 减少喂给模型的 token；(3) 推理时 KV Cache 加速生成。**单用一个不够，叠加才能达到生产级性能**。

**追问**：那这三个怎么排优先级？
按 ROI：(1) **Prefix Caching** 第一——开启推理引擎开关即可，零额外开销，对有固定 system prompt 的应用立即生效；(2) **KV Cache** 默认就有（除非你手动关），不用特意做；(3) **Prompt Compression** 第三——需要部署额外服务（LLMLingua 模型）、需要在评估集上调参、需要监控效果损失。所以**先开 prefix caching，看效果还不够再上 compression**。多数中小规模应用，prefix caching 已经能解决 70% 的成本/延迟问题。

---

## 延伸阅读

- **论文：LLMLingua** ([arxiv 2310.05736](https://arxiv.org/abs/2310.05736))
  Jiang et al. 2023。读它是为了理解"用 perplexity 衡量 token 重要性"这个核心 idea——简单优雅且 work。

- **论文：LLMLingua-2** ([arxiv 2403.12968](https://arxiv.org/abs/2403.12968))
  Pan et al. 2024。读它是为了看从 perplexity 升级到 classifier 的改进——速度提升 + 适配性更广。

- **代码：LLMLingua GitHub** ([github.com/microsoft/LLMLingua](https://github.com/microsoft/LLMLingua))
  微软官方实现。README 里有完整使用示例，自部署只需几行代码。

- **论文：Gisting** ([arxiv 2304.08467](https://arxiv.org/abs/2304.08467))
  Mu et al. 2023。读它是为了了解"soft prompt 压缩"这个研究方向——压缩比能到 50-100x，但损失也大，是研究为主。

- **论文：Lost in the Middle** ([arxiv 2307.03172](https://arxiv.org/abs/2307.03172))
  Liu et al. 2024。读它是为了理解"长上下文不能等同于好上下文"——这是 prompt compression 在长上下文时代仍然重要的根本原因。

- **配套阅读**：[推理优化](../llm/inference-optimization) — KV Cache 和 Prefix Caching 的工程细节。[RAG - reranking](../rag/reranking) — RAG 场景下"减少喂给 LLM 的 chunk"的压缩思路。
