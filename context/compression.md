---
title: 上下文压缩与摘要
description: 摘要、抽取、分层压缩——上下文工程的核心动作。把 100K 上下文压到 10K 还保留 90% 有效信息，是长 Agent 必备能力。
pageClass: context-compression-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">上下文工程</p>
  <h1>上下文压缩与摘要</h1>
  <p class="doc-hero__lead">摘要、抽取、分层压缩——上下文工程的核心动作。把 100K 上下文压到 10K 还保留 90% 有效信息，是长 Agent 必备能力。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：上下文工程进阶</span>
    <span>核心：摘要 / 抽取 / 分层 / 滚动</span>
    <span>面试重点：和 prompt-level 压缩的区别</span>
  </div>
</section>

> **注**：本文聚焦"上下文级别"的压缩——摘要、抽取、滚动等架构层手段。LLMLingua、token-level 压缩等技术细节见 [Prompt 压缩](../prompt/compression)。

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>上下文压缩和 prompt compression 是同一回事吗？</strong>
    <span>考概念分层，前者偏架构后者偏算法。</span>
  </div>
  <div>
    <strong>Map-Reduce、Refine、Stuff 三种摘要策略各自适合什么场景？</strong>
    <span>考 LangChain 经典三策略。</span>
  </div>
  <div>
    <strong>多轮对话历史用滚动摘要 (rolling summary)，关键信息怎么不丢？</strong>
    <span>考工程细节，能不能讲清"分层记忆"思路。</span>
  </div>
  <div>
    <strong>抽取式摘要 vs 生成式摘要在 Agent 场景哪个更合适？</strong>
    <span>考权衡，事实保真度 vs 信息密度。</span>
  </div>
  <div>
    <strong>压缩是用 LLM 还是用 embedding？两种各自的代价？</strong>
    <span>考成本意识。</span>
  </div>
  <div>
    <strong>压缩后怎么验证信息没丢？怎么 debug？</strong>
    <span>考评估方法论。</span>
  </div>
  <div>
    <strong>Claude Code 用什么策略管理长 session 的上下文？</strong>
    <span>考实战观察，了解主流 Agent 怎么做。</span>
  </div>
</div>

---

## 为什么上下文压缩独立成一章

**Prompt compression**（如 LLMLingua）和**上下文压缩**是两个不同层次：

| 维度 | Prompt Compression | 上下文压缩 |
|---|---|---|
| **层次** | token 级（删除冗余 token） | 信息级（保留语义） |
| **方法** | 算法（perplexity、classifier） | LLM 摘要、规则抽取、分层管理 |
| **适用** | 单次长 prompt | 多轮 Agent / 长 session |
| **粒度** | 字符串变换 | 语义重组 |
| **典型场景** | 长文档塞 prompt | Agent 多轮对话历史管理 |

简单说：**Prompt compression 是把"一坨字"压短，上下文压缩是把"对话/任务历史"提炼成精华**。

Agent 长 session 的真实挑战：跑 50 步任务后，前面的工具调用结果、用户反馈、中间思考过程加起来可能几十 K token。直接塞进每一步的 prompt——成本爆炸 + Lost in the Middle + KV Cache 爆显存。

**上下文压缩就是 Agent 的"记忆 GC"机制**——决定哪些过去要保留全文、哪些可以摘要、哪些可以扔。

---

## 三大经典压缩策略

LangChain 早期总结的三种文档摘要策略，至今仍是上下文压缩的基础范式：

### 策略 1：Stuff（直接塞）

把所有内容拼接，一次性扔给 LLM 摘要：

```
prompt = """
请总结以下所有内容：

{doc1}

{doc2}

...
"""
summary = llm.chat(prompt)
```

- ✅ 简单、一次调用
- ❌ 长度有上限（受 context window 限制）
- ❌ Lost in the Middle 风险

**适合**：内容总长 < 模型上下文一半时。

### 策略 2：Map-Reduce

分两阶段：
1. **Map**：每个文档/段落独立摘要
2. **Reduce**：把所有摘要再综合成一个

```python
def map_reduce_summary(docs, llm):
    # Map
    summaries = [llm.chat(f"摘要：{d}") for d in docs]
    # Reduce
    combined = "\n\n".join(summaries)
    return llm.chat(f"综合以下摘要写一个最终总结：\n{combined}")
```

- ✅ 能处理任意长度（map 阶段独立）
- ✅ map 阶段可以并行（加速）
- ❌ 失去跨段落的关联信息
- ❌ 调用次数多（成本）

**适合**：长文档摘要、多文档综合。LangChain 的 `MapReduceDocumentsChain` 实现。

### 策略 3：Refine（迭代细化）

从第一段摘要开始，每读一段就细化一次：

```python
def refine_summary(docs, llm):
    summary = llm.chat(f"摘要：{docs[0]}")
    for d in docs[1:]:
        summary = llm.chat(f"""
当前摘要：{summary}
新内容：{d}
请基于新内容更新摘要：""")
    return summary
```

- ✅ 保留上下文关联（每步知道之前所有内容）
- ❌ 必须串行（不能并行）
- ❌ 后面段落对早期段落影响弱

**适合**：连续性强的内容（剧情、推理过程）、需要保持"叙事一致"的场景。

### 三者对比

| 策略 | 调用次数 | 并行 | 连贯性 | 长度上限 |
|---|---|---|---|---|
| **Stuff** | 1 | N/A | 最好 | 受 context 限制 |
| **Map-Reduce** | N+1 | 是 | 中等 | 无限 |
| **Refine** | N | 否 | 好 | 无限 |

---

## Agent 场景的滚动摘要 (Rolling Summary)

多轮 Agent 会话的典型压缩模式：

```
[System Prompt]
[Old conversation summary]   ← 把早期对话压缩成摘要
[Last N turns]                ← 保留最近 N 轮原文
[Current user message]
```

每隔几轮触发一次"压缩旧轮次"：

```python
def manage_chat_history(messages, llm, max_recent=10):
    if len(messages) < max_recent + 5:
        return messages   # 短对话不压

    system = messages[0]
    recent = messages[-max_recent:]
    old = messages[1:-max_recent]

    summary = llm.chat(f"""把下面的对话历史压缩成 200 字以内的摘要。
保留：用户的偏好、已确定的事实、未解决的问题。
省略：寒暄、重复的内容。

{format_messages(old)}""")

    return [
        system,
        {"role": "system", "content": f"先前对话摘要：{summary}"},
        *recent
    ]
```

### 滚动摘要的关键设计

**1. 保留什么、丢什么**

```
保留（高价值）:
- 用户明确表达的偏好（"我只喜欢温和的语气"）
- 已确认的事实（订单号、用户身份）
- 未完成的任务（待办）
- 关键约束（用户要求过的拒绝项）

丢弃（低价值）:
- 寒暄
- 已解决的问题
- 重复确认
- 模型的冗长解释
```

**2. 分层时间策略**

```
Tier 1: 最近 5 轮 - 完整原文
Tier 2: 5-20 轮  - 每 5 轮摘要一次
Tier 3: 20+ 轮  - 整体摘要 + 关键事实列表
```

不同时间段用不同压缩粒度——近的精细、远的粗略。

**3. 关键事实独立存储**

不要靠摘要保留所有事实——用结构化字段提取：

```python
chat_state = {
    "user_facts": {
        "name": "小明",
        "language_preference": "中文",
        "verified_orders": ["ABC-1234"]
    },
    "pending_tasks": ["处理退款 XYZ-5678"],
    "constraints": ["不接受邮件提醒"],
    "recent_messages": [...]  # 最近 N 轮原文
}
```

每轮把 chat_state 序列化后注入 prompt，比纯摘要可靠得多。

---

## 抽取式 vs 生成式压缩

**生成式**：让 LLM 重写成摘要（前面所有例子）
- ✅ 信息密度高
- ❌ 可能改写/丢失/扭曲原文
- ❌ 每次调用都有成本

**抽取式**：从原文里挑出关键句子/段落
- ✅ 100% 保真（直接原文）
- ✅ 不需要 LLM（可以用 embedding + 重要性打分）
- ❌ 压缩率低（受原文表达限制）
- ❌ 抽取出的句子可能不连贯

### 抽取式压缩实现

```python
from sentence_transformers import SentenceTransformer
import numpy as np

embedder = SentenceTransformer("BAAI/bge-large-zh-v1.5")

def extractive_compress(text, query, ratio=0.3):
    sentences = split_sentences(text)
    sent_vecs = embedder.encode(sentences, normalize_embeddings=True)
    query_vec = embedder.encode([query], normalize_embeddings=True)

    # 按相关性给每句打分
    scores = (sent_vecs @ query_vec.T).flatten()

    # 选前 ratio 比例的句子（保持原顺序）
    n_keep = max(1, int(len(sentences) * ratio))
    top_idx = sorted(np.argsort(-scores)[:n_keep])

    return "\n".join(sentences[i] for i in top_idx)
```

**Agent 场景的实战推荐**：
- **事实型上下文**（订单、用户档案、检索文档）→ 抽取式（保真重要）
- **过程型上下文**（中间思考、工具调用序列）→ 生成式（密度重要）

---

## Claude Code 等主流 Agent 的做法

观察主流编程 Agent（Claude Code、Cursor、Cline）的上下文管理实现，有一些共同模式：

### 1. 工具调用结果的截断

```
工具调用返回 5000 行日志 → 只保留 head 100 + tail 100 + "... (4800 lines omitted) ..."
```

工具返回经常是巨大的——日志、目录列表、grep 结果。完整保留浪费 token，且模型经常只需要"判断成功/失败 + 关键信息"。

### 2. 文件内容的"按需重读"

不要把所有读过的文件持续保留在 context。Agent 应该：
- 第一次读文件，原文进入 context
- 经过若干步，文件原文从 context 移除
- 需要时重新读（用 `read_file` 工具）

牺牲一次工具调用，换 context 不无限增长。

### 3. Auto-Compact / "压缩点"

Claude Code 等在 context 接近上限时触发自动压缩：
- 让 LLM 生成"过去工作的摘要"
- 摘要 + 系统状态 + 最近几步替换原 context

用户经常看到"compacting context"——就是这个机制。

### 4. 优先级标记

不同信息有不同保留优先级：

```
P0（永远保留）: System prompt、用户最终任务、关键约束
P1（保留摘要）: 中间步骤、决策点、失败和反思
P2（截断）: 工具大输出、重复确认
P3（丢弃）: 寒暄、过期讨论
```

压缩时按优先级倒序丢弃。

---

## 实战：完整的 Agent 上下文管理器

```python
from dataclasses import dataclass, field
from typing import Literal

@dataclass
class ContextManager:
    system_prompt: str
    max_tokens: int = 100000
    recent_window: int = 10            # 保留最近 N 轮原文
    facts: dict = field(default_factory=dict)   # 抽取的关键事实
    history: list = field(default_factory=list)
    old_summary: str = ""

    def add_message(self, role, content):
        self.history.append({"role": role, "content": content})

        # 触发压缩
        if self._estimate_tokens() > self.max_tokens * 0.8:
            self._compact()

    def build_messages(self):
        """返回喂给 LLM 的 messages 列表"""
        msgs = [{"role": "system", "content": self.system_prompt}]

        # 注入摘要 + 关键事实
        if self.old_summary or self.facts:
            ctx = self._format_context()
            msgs.append({"role": "system", "content": ctx})

        # 最近原文
        msgs.extend(self.history[-self.recent_window:])
        return msgs

    def _compact(self):
        """压缩超出窗口的旧消息"""
        old = self.history[:-self.recent_window]
        if not old:
            return

        # 抽取关键事实
        new_facts = self._extract_facts(old)
        self.facts.update(new_facts)

        # 生成摘要（旧摘要 + 新增）
        prompt = f"""压缩成 200 字以内摘要，保留任务进展和未决问题。

旧摘要: {self.old_summary}
新内容: {self._format_messages(old)}

新摘要:"""
        self.old_summary = call_llm(prompt)

        # 截断 history
        self.history = self.history[-self.recent_window:]

    def _format_context(self):
        parts = []
        if self.old_summary:
            parts.append(f"先前对话摘要: {self.old_summary}")
        if self.facts:
            parts.append("已确认事实:")
            for k, v in self.facts.items():
                parts.append(f"  - {k}: {v}")
        return "\n".join(parts)

    def _estimate_tokens(self):
        # 粗略估算
        total = len(self.system_prompt) + len(self.old_summary)
        total += sum(len(str(self.facts)))
        total += sum(len(m["content"]) for m in self.history)
        return total // 3   # 中文大致 1 token / 1.5 字符
```

这个类管理：
- System prompt（永久保留）
- 老对话摘要（动态更新）
- 关键事实（结构化）
- 最近 N 轮（原文）

压缩动态触发，对外接口（`add_message`、`build_messages`）简单。

---

## 常见陷阱

### 陷阱 1：摘要把关键事实写错

摘要是 LLM 生成的，本质上有幻觉风险。"用户的订单号是 ABC-1234" 可能被压缩成 "用户的订单号是 ABC-1243"——一个字符错就翻车。

**对策**：关键事实（订单号、用户名、金额、时间）不要靠摘要保留，**用规则抽取存到结构化字段**。

### 陷阱 2：压缩太激进丢失关键信息

为省 token 把摘要压到 50 字 → 信息密度过高 → 模型读了等于没读。

**经验值**：每轮对话压缩比 5-10x，最终上下文不要 < 1000 token。

### 陷阱 3：压缩破坏了 prompt cache

摘要是动态生成的——每次内容都不同 → prefix cache 全失效。

**对策**：
- System prompt 保持稳定（最前面），摘要插在中间
- 摘要触发频率不要太高（每 5-10 轮才更新一次）
- 用 cache key 设计让"未压缩部分"仍能命中

详见 [上下文缓存](./caching)。

### 陷阱 4：不区分"事实"和"过程"

`messages` 里同时包含：用户事实、Agent 思考、工具结果、错误回滚——一锅炖摘要会把它们混淆。

**对策**：按类型独立管理：
```
state = {
    "facts": {...},          # 结构化事实
    "task_progress": "...",  # 任务进度的自然语言描述
    "recent_messages": [...] # 最近原文
}
```

### 陷阱 5：摘要后没法 debug

模型出错时回溯历史，发现原文已经被压缩——无法判断错在哪一步。

**对策**：所有原始消息保留到独立 log（不进入 context，但可查询），便于 debug。压缩后的 context 是"模型看到的"，原始 log 是"真实发生的"——分开存。

### 陷阱 6：压缩频率不对

- 太频繁（每轮都压）→ 调用次数爆炸、性能下降
- 太稀疏（context 满了才压）→ 中间已经触发 Lost in the Middle 或被截断

**经验**：当 context 占用达 70-80% max 时触发压缩。

---

## 面试题深度解析

### Q: Map-Reduce vs Refine vs Stuff 摘要策略怎么选？

**30 秒版本**：(1) **Stuff**：所有内容拼一起一次调 LLM，简单但受 context 长度限制，适合短到中等长度；(2) **Map-Reduce**：每段独立摘要再综合，能处理任意长度且 map 阶段可并行，但丢失跨段落关联，适合多文档独立内容综合；(3) **Refine**：从第一段开始迭代细化，保留连贯性，但必须串行且后面影响前面弱，适合叙事性内容（剧情、推理过程）。**实战推荐**：长文档 + 独立性强 → Map-Reduce；连续叙事 → Refine；短内容 → Stuff。

**追问**：那对话历史压缩用哪种？
对话历史一般用**滚动摘要 + Refine 思路**——旧对话的摘要随新对话不断更新（refine），不是每次从零摘要。具体说：`new_summary = LLM("旧摘要 + 新增对话 → 更新后的摘要")`。这种增量更新比每次 Map-Reduce 重新摘要省成本，且保持对话连贯性。

### Q: Claude Code 这类长 session Agent 怎么管理上下文？

**30 秒版本**：观察到几个共同模式：(1) **工具调用结果截断**——大输出（日志、文件内容）只保留 head+tail；(2) **文件按需重读**——读过的文件不持续占 context，需要时重新调 read_file 工具；(3) **Auto-Compact**——context 接近上限时触发自动摘要，用 "过去工作的摘要 + 最近 N 步" 替换原 context；(4) **优先级丢弃**——系统 prompt 和用户最终任务永远保留，中间过程优先级低被先丢。Claude Code 用户经常看到 "Compacting conversation..." 就是这个机制在跑。

**追问**：那压缩后模型怎么知道之前做了什么？
靠"工作摘要" + "结构化状态"。摘要是自然语言（"已读取 3 个文件、修改了 auth.py 的 login 函数、运行 tests 发现一个失败"），状态是结构化（已读文件列表、已修改文件列表、待办事项）。两者结合让模型有"我现在在哪一步、之前做了什么"的认知。这比"原文滚动"省 token 多得多，且关键信息不丢。

### Q: 抽取式 vs 生成式压缩，Agent 场景怎么选？

**30 秒版本**：分内容类型：(1) **事实型上下文**（订单号、用户档案、检索文档）→ **抽取式**，保真度优先，不能让摘要篡改数字 / ID / 关键事实；(2) **过程型上下文**（中间思考、工具调用序列、错误反思）→ **生成式**，信息密度优先，原文太冗余。生产 Agent 通常**两者混用**：关键事实独立存为结构化字段（抽取式）+ 过程内容用生成式摘要 + 最近几步保留原文。

**追问**：那抽取式压缩用什么算法？
两种主流：(1) **基于 embedding 的句子重要性打分**——把每句嵌入，按与"任务目标"的相似度排序，挑前 K 个；(2) **基于规则的实体抽取**——用 NER 或 regex 提取订单号、日期、金额等结构化信息存为字段。生产里两者结合：embedding 抽出相关段落 + 规则抽出关键实体存档。

### Q: 怎么验证压缩后信息没丢？

**30 秒版本**：四种方法：(1) **对照评估**——准备"理想回答"评估集，对比压缩前后下游任务的准确率；(2) **关键事实回溯**——压缩后让 LLM 回答"用户的订单号是什么"等关键事实，看能否准确回答；(3) **原文 vs 摘要对比**——人工抽样检查摘要是否准确反映原文；(4) **生产监控**——压缩后的会话有没有出现"忘了用户身份"、"重复问已答过的问题"这类症状。**关键原则**：任何压缩策略上线前必须有评估集 baseline，任何参数调整后必须重测——压缩是高风险优化，不能凭感觉。

**追问**：那 LLM-as-judge 能不能自动评估摘要质量？
能做粗筛但不能完全替代人工。LLM judge 评摘要的常见问题：(1) **风格偏好**——judge 偏爱长摘要 / 结构化输出；(2) **事实校验弱**——judge 自己也是 LLM，可能漏掉事实错误；(3) **不一致**——同一摘要不同 judge 给分差距大。生产做法：LLM-as-judge 做 80% 自动评估 + 关键 case 人工抽查 10% + 真实用户反馈兜底 10%。

---

## 延伸阅读

- **LangChain 文档：Document Chains** ([python.langchain.com/docs/tutorials/summarization](https://python.langchain.com/docs/tutorials/summarization/))
  Stuff / Map-Reduce / Refine 三策略的官方实现。读源码能掌握每种策略的细节。

- **博客：Claude Code Internals** (Anthropic 的工程博客)
  搜 "Claude Code agentic context management"，能看到他们对长 session 上下文管理的设计思路。

- **论文：MemGPT** ([arxiv 2310.08560](https://arxiv.org/abs/2310.08560))
  Packer et al. 2023。把 OS 的虚拟内存思想引入 LLM 上下文管理——"主存"（in-context）+ "外存"（外部存储）+ 自动 page swap。读它会建立"context 是稀缺资源、需要主动管理"的直觉。

- **论文：RAPTOR** ([arxiv 2401.18059](https://arxiv.org/abs/2401.18059))
  Sarthi et al. 2024。分层摘要的检索增强思路——把长文档递归摘要成树，按需检索不同层级。是分层压缩的代表方法。

- **配套阅读**：[Prompt 压缩](../prompt/compression) — token 级压缩算法（LLMLingua）。[记忆系统](./memory) — 上下文的"外存"，长期记忆设计。[会话历史管理](./history) — 多轮对话的实操细节。
