---
title: 上下文缓存
description: Anthropic / Gemini / DeepSeek / OpenAI 四家 Prompt Cache 机制对比、命中策略、成本测算与生产实战。
pageClass: context-caching-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">上下文工程</p>
  <h1>上下文缓存</h1>
  <p class="doc-hero__lead">同样的 system prompt 喂 100 次，不开 cache 你付 100 次 prefill 钱——四家 API 的 prompt cache 是长上下文应用唯一能 scale 的杠杆。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：生产 / 成本治理</span>
    <span>核心：prefix 命中策略 + 四家机制对比</span>
    <span>面试重点：cache 与 KV Cache 的区别、命中率设计</span>
  </div>
</section>

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>API 层的 prompt cache 和推理引擎里的 prefix caching 是不是一回事？</strong>
    <span>考你能不能分清"产品功能"和"底层优化"。</span>
  </div>
  <div>
    <strong>Anthropic、Gemini、DeepSeek、OpenAI 四家的 cache 机制有什么本质区别？</strong>
    <span>考四家 API 的细节掌握度。</span>
  </div>
  <div>
    <strong>为什么 cache 必须 prefix 匹配？为什么换个标点就可能全 miss？</strong>
    <span>考对 KV Cache 物理本质的理解。</span>
  </div>
  <div>
    <strong>Anthropic 写入贵 25%、命中省 90%——什么时候开 cache 反而亏？</strong>
    <span>考 break-even 测算能力。</span>
  </div>
  <div>
    <strong>Agent 多轮对话场景下，怎么布局 prompt 让 cache 命中率最高？</strong>
    <span>考工程实战，能不能讲清固定段与变化段的分层。</span>
  </div>
  <div>
    <strong>为什么 cache hit rate 上线后会悄悄下降？怎么监控？</strong>
    <span>考可观测性，cache miss 不报警是常见线上事故。</span>
  </div>
  <div>
    <strong>OpenAI 的自动 cache 跟 Anthropic 的显式 cache_control 各有什么优劣？</strong>
    <span>考 API 设计哲学的辨析。</span>
  </div>
</div>

---

## 为什么需要 prompt cache

考虑一个真实的合同分析 Agent。用户上传一份 80K token 的并购协议，然后连续问 10 个问题：合同金额？交割条件？竞业条款？……

不开 cache 的成本（以 Claude Sonnet 4.x 为例，input 单价约 $3/M token）：

```
单次请求 input token = 80K（合同）+ 2K（system + 历史） + 0.2K（问题）≈ 82K
单次 prefill 延迟 ≈ 5-10 秒
10 个问题成本 = 82K × 10 × $3/M = $2.46
10 个问题总延迟 = 50-100 秒（用户体验灾难）
```

开 cache 之后：

```
第 1 次：写入 cache，付全价 + 25% 写入溢价 ≈ $0.30
第 2-10 次：命中 cache 部分（80K）按 10% 计费，新增部分（问题）全价
后 9 次成本 ≈ 9 × (80K × $0.30/M + 2.2K × $3/M) = $0.27
总成本 ≈ $0.57（省 77%）
后续 9 次 prefill 延迟降到 1-2 秒
```

**省的不只是钱，是产品形态**。没有 prompt cache，"和一份长文档对话"这种产品根本做不下去——延迟和成本都不可接受。

底层的 KV Cache 和推理引擎的 prefix caching 详见 [推理优化](../llm/inference-optimization)。本文讲的是各家 API 暴露给应用层的那一层——**用户可控、计费可见、有 TTL 的 cache 产品**。

---

## prompt cache 到底缓存了什么

一句话：**复用已经算好的 KV Cache，跳过 prefill**。

回忆 [Transformer 架构](../llm/transformer)：模型处理 prompt 时，每一层每个 token 都会算出对应的 Key 和 Value 张量，存进 KV Cache。这部分计算（prefill）的成本与 prompt 长度成正比——100K token 通常要 5-15 秒。

prompt cache 做的事情：

```
请求 1: [system: 你是合同分析助手][长合同 80K][问题 A]
   ↓ 服务端算完 KV，把前缀部分的 KV Cache 存到某个共享存储
   
请求 2: [system: 你是合同分析助手][长合同 80K][问题 B]
   ↓ 服务端发现前缀和请求 1 一致
   ↓ 直接复用已存的 KV Cache，只 prefill [问题 B] 那 200 个 token
   ↓ 计费时前缀部分按"cache hit"折扣价
```

三个关键事实必须刻进肌肉记忆：

**1. cache 是 prefix-match，不是 substring-match**。前缀必须从第一个 token 开始完全一致。把变量塞到 prompt 开头，cache 永远 miss。

**2. cache 命中的最小单位是 block（不同厂商不同，通常 16-128 token）**。改一个 token 不会"只 miss 一个 token"，而是从那个 block 之后全部 miss。

**3. cache 是物理存储的 KV 张量，不是文本**。所以 tokenization 后的字节级一致才算命中——大小写、空格、unicode 形式都敏感。

### 和推理引擎的 prefix caching 区别在哪

| 层 | 谁负责 | 用户可见 | 控制粒度 | 跨请求 |
|---|---|---|---|---|
| **推理引擎 prefix caching**（vLLM/SGLang） | 推理引擎自动管理 | 不可见，看不到命中率 | 引擎内部 block | 同一进程内 |
| **API 层 prompt cache**（本文主题） | API 厂商作为产品 | 可见，有计费、TTL、命中率字段 | 用户标注或自动识别 | 跨用户跨请求（同账号内） |

简单说：**vLLM 的 prefix caching 是引擎为了多打几个并发自动做的优化**，你看不到也管不着；**Anthropic 的 prompt cache 是它把这个能力包装成产品卖给你**，你能显式标记、能看到命中率、能算账。

两者底层用的都是同一份 KV Cache 机制，但在产品形态上是两个世界。

---

## 四家机制详细对比

这是本文的核心。截至 2025 年公开文档（具体数字和细则可能调整，请以官方为准）：

| 维度 | Anthropic Prompt Caching | Google Gemini Context Caching | DeepSeek Context Cache | OpenAI Prompt Caching |
|---|---|---|---|---|
| **触发方式** | 显式，需在请求里加 `cache_control` 标注 | 显式，需先调 `CachedContent` API 创建 cache 对象 | 完全自动，无需任何代码改动 | 完全自动，prompt > 1024 token 自动尝试 |
| **最小可缓存长度** | 1024 token（Sonnet/Opus）/ 2048 token（Haiku 部分版本） | 较高门槛（不同模型不同，通常数千 token） | 无明确最低，但短 prompt 命中价值不大 | 1024 token |
| **TTL** | 默认 5 分钟，可付费升到 1 小时 | 用户在创建时显式设置（分钟到小时） | 数小时（厂商自动管理） | 约 5-10 分钟，闲置自动失效 |
| **写入成本** | 比正常 input 贵 25%（5 分钟 cache）/ 100%（1 小时 cache） | 单独计费：存储按 token-hour 计 + 创建时算一次 | 无额外写入费 | 无额外写入费 |
| **命中折扣** | 命中部分按正常 input 价格的 10%（省 90%） | 命中部分有显著折扣 + 单独的存储费 | 命中 token 折扣（具体比例参考官方） | 命中部分按正常 input 价格的 50%（省 50%） |
| **可缓存位置** | 最多 4 个 cache breakpoint，可标注 system / tools / messages | 整个 CachedContent 块 | 自动识别共同前缀 | 自动识别共同前缀 |
| **是否计入限流配额** | 命中部分仍计 input token，但单价低 | 单独计量 | 仍按正常 token 计 | 仍按正常 token 计 |
| **跨账号共享** | 否，账号隔离 | 否，账号隔离 | 否 | 否 |

### Anthropic：显式标注 + breakpoint

Anthropic 的设计哲学是"让开发者明确控制 cache 在哪里切分"。请求体里在某个内容块上加 `"cache_control": {"type": "ephemeral"}`，从开头到该位置的所有内容会被尝试缓存。

```json
{
  "system": [
    {"type": "text", "text": "你是合同分析助手..."},
    {"type": "text", "text": "<合同全文 80K>", "cache_control": {"type": "ephemeral"}}
  ],
  "messages": [
    {"role": "user", "content": "合同金额是多少？"}
  ]
}
```

最多 4 个 breakpoint，所以可以做"分层 cache"：

```
[超稳定 system prompt]         ← breakpoint 1（cache 几小时）
[工具定义 tools]               ← breakpoint 2（每次发版变）
[长文档/RAG 检索结果]          ← breakpoint 3（每个 session 变）
[历史对话]                     ← breakpoint 4（每轮变）
[当前用户消息]                 ← 不 cache
```

每个 breakpoint 对应一个独立的 cache 项，前面的没变就能继续命中。

**写入贵 25%、命中省 90%** 是关键数字。意味着 cache 至少被命中 **(1.25 - 0.1) / (1 - 0.1) ≈ 1.28 次** 才回本——换句话说，**写入后只用 1 次就扔掉是亏的，用 2 次以上就开始赚**。

### Gemini：显式创建 cache 对象 + 独立计费

Gemini 的 API 把 cache 设计成一个"资源对象"——先调 `cachedContents.create` 创建一个带 TTL 的 cache，拿到 ID，后续请求引用这个 ID。

```python
from google import genai

client = genai.Client()
cache = client.caches.create(
    model="gemini-2.5-pro",
    config={
        "contents": [{"role": "user", "parts": [{"text": "<长文档 80K>"}]}],
        "system_instruction": "你是合同分析助手",
        "ttl": "3600s",  # 1 小时
    }
)
# 后续请求引用 cache.name
response = client.models.generate_content(
    model="gemini-2.5-pro",
    contents="合同金额是多少？",
    config={"cached_content": cache.name}
)
```

特点：
- TTL 用户自己设，长一点要付更多存储费
- cache 本身的存储按"token-hour"独立计费
- 适合"显式管理生命周期"的场景，比如"一份文档对话 1 小时就过期"

Gemini 的 cache 在视频/音频长上下文场景特别有价值——把 1 小时视频缓存住，反复对话只付一次解码成本。

### DeepSeek：纯自动，零代码改造

DeepSeek 在 API 里**完全自动**做 context cache。你不需要改任何代码，服务端识别请求间的共同前缀，命中部分按低价计费。

响应里会返回 `prompt_cache_hit_tokens` 和 `prompt_cache_miss_tokens`，可以监控命中率：

```python
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[...]
)
hit = response.usage.prompt_cache_hit_tokens
miss = response.usage.prompt_cache_miss_tokens
hit_rate = hit / (hit + miss)
```

优点：零迁移成本，老代码直接享受降价。
缺点：你无法控制"什么该缓存什么不该"——但实际场景里"按 prefix 自动"几乎总是对的。

DeepSeek 的定价本身就极低，叠加自动 cache 后，长上下文 RAG 场景成本可能比 GPT-4o 低一个量级。

### OpenAI：自动 + 50% 折扣

OpenAI 在 2024 年 10 月推出 Prompt Caching，机制类似 DeepSeek——**完全自动，prompt > 1024 token 才会尝试 cache**，命中部分按正常 input 价格的 50% 计费（注意是 50% 不是 90%）。

```python
response = client.chat.completions.create(model="gpt-4o", messages=[...])
cached_tokens = response.usage.prompt_tokens_details.cached_tokens
```

OpenAI 的折扣比 Anthropic 浅（50% vs 90%），TTL 也短（约 5-10 分钟，且无法延长），但**胜在零侵入**——所有现有代码自动享受。

### 一句话总结四家哲学

- **Anthropic**：把 cache 做成精细可控的工程产品，省得多但要会用
- **Gemini**：把 cache 做成"资源对象"，适合显式生命周期管理
- **DeepSeek**：完全透明，价格本来就低再叠加自动降价
- **OpenAI**：完全透明，折扣浅但零迁移成本

---

## 实战：Anthropic SDK + cache_control + 命中率监控

下面是一个生产可用的合同问答 demo，演示分层 cache + 命中率统计：

```python
import os
import anthropic

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

# 假设这份合同已经从 PDF 解析成文本，长度约 80K token
with open("merger_agreement.txt") as f:
    contract = f.read()

SYSTEM_PROMPT = """你是一位资深并购律师，专门审查合同中的关键条款。
回答时请引用合同原文段落，并指出在第几条。如果合同没有提到，明确说"合同未涉及"，不要编造。"""

def ask(question: str, conversation_history: list) -> dict:
    """对当前合同问一个问题，返回答案 + cache 命中统计。"""
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        system=[
            # breakpoint 1: 角色指令（极稳定，几乎永远命中）
            {"type": "text", "text": SYSTEM_PROMPT},
            # breakpoint 2: 长合同（一次 session 内稳定，整段命中）
            {
                "type": "text",
                "text": f"<合同全文>\n{contract}\n</合同全文>",
                "cache_control": {"type": "ephemeral"},
            },
        ],
        messages=[
            *conversation_history,  # 历史轮次
            {"role": "user", "content": question},
        ],
    )

    usage = response.usage
    return {
        "answer": response.content[0].text,
        # 关键监控字段——必须打到日志
        "cache_creation_input_tokens": usage.cache_creation_input_tokens,  # 这次写入 cache 的 token
        "cache_read_input_tokens": usage.cache_read_input_tokens,          # 命中 cache 的 token
        "input_tokens": usage.input_tokens,                                # 没走 cache 的 input
        "output_tokens": usage.output_tokens,
    }

history = []
for q in ["合同总金额是多少？", "交割的先决条件有哪些？", "违约责任怎么约定？"]:
    result = ask(q, history)
    print(f"\nQ: {q}\nA: {result['answer'][:120]}...")
    print(f"  cache_write={result['cache_creation_input_tokens']:>6}  "
          f"cache_read={result['cache_read_input_tokens']:>6}  "
          f"uncached_in={result['input_tokens']:>4}  out={result['output_tokens']:>4}")
    history.append({"role": "user", "content": q})
    history.append({"role": "assistant", "content": result["answer"]})
```

预期输出：

```
Q: 合同总金额是多少？
  cache_write= 80123  cache_read=     0  uncached_in=  18  out= 156   ← 第 1 次写入
Q: 交割的先决条件有哪些？
  cache_write=     0  cache_read= 80123  uncached_in= 198  out= 287   ← 命中
Q: 违约责任怎么约定？
  cache_write=     0  cache_read= 80123  uncached_in= 510  out= 245   ← 命中
```

**生产代码必须做的两件事**：

1. **把 `cache_read_input_tokens / total_input_tokens` 作为指标推到 Grafana**。这个值低于预期（比如预期 80% 实际 30%）说明 prompt 模板里有变量污染了 prefix。

2. **报警条件设成 cache_creation 持续走高**——意味着 cache 一直在被写入而很少命中，可能 TTL 不够长或者 prompt 频繁变动。

---

## 命中策略：prompt 怎么布局

这是 cache 设计的核心。一条铁律：**越稳定的内容越靠前，越易变的内容越靠后**。

### 推荐布局（从前到后）

```
1. 角色 / 任务说明              ← 几乎不变，跨所有用户共享（如果不带用户信息）
2. 工具定义 tools / function    ← 每次发版变，session 内稳定
3. Few-shot 示例                ← 稳定
4. 长文档 / RAG 检索结果        ← 每个 session 变，session 内稳定 ← 主要的 cache 收益点
5. 历史对话 turn 1...n          ← 每轮追加（追加是 OK 的，prefix 仍然命中）
6. 当前用户输入                 ← 每次必变，不可能 cache
```

注意第 5 点——**追加新轮次不会破坏前面的 cache**。这是为什么 Anthropic 把 cache 推荐给"Agent 多轮对话"场景：每追加一轮，前面的 system + tools + 历史轮次仍然全部命中，只有最新 user message 是新算。

### 反模式（不要这样写）

```
# ❌ 反模式 1：在 system prompt 开头插入时间戳
system = f"当前时间是 {datetime.now()}\n你是助手..."
# → 每次时间不一样，cache 100% miss

# ❌ 反模式 2：把 user_id 塞进 system
system = f"你正在为用户 {user.id} 服务，请..."
# → 每个用户一份 cache，cache 命中率随用户数下降到 0

# ❌ 反模式 3：动态拼接工具列表（顺序不固定）
tools = [random.shuffle(available_tools)]
# → 工具顺序变 = bytes 变 = cache miss

# ❌ 反模式 4：RAG 检索结果排序不稳定
context = vector_db.search(q, k=5)  # 每次返回顺序可能微变
# → 检索结果在前缀里，顺序变就全 miss
```

修法：**把所有"用户/时间/随机"相关的内容统一推到 prompt 末尾，并在 RAG 这种场景做稳定排序**（如按 doc_id 排序后再拼接）。

---

## 成本测算：一个具体 case

场景：长合同 RAG Agent。
- 合同长度 100K token
- 单次问答：system 1K + 合同 100K + 历史 2K + 问题 0.2K ≈ 103K input
- 单次 output 约 500 token
- 用户一次 session 平均问 10 个问题
- 用 Claude Sonnet 4.x（假设 input $3/M、output $15/M、cache write $3.75/M、cache read $0.30/M）

**不开 cache**：

```
单次 input 成本 = 103K × $3/M = $0.309
单次 output 成本 = 500 × $15/M = $0.0075
单次合计 ≈ $0.317
10 次 session 成本 = $3.17
```

**开 cache（system + 合同共 101K 标 cache_control）**：

```
第 1 次（写入）：
  cache_write: 101K × $3.75/M = $0.379  ← 比不开贵 25%
  uncached_in: 2.2K × $3/M    = $0.0066
  output:      500 × $15/M    = $0.0075
  小计 = $0.393

第 2-10 次（命中）：
  cache_read:  101K × $0.30/M = $0.0303
  uncached_in: 2.2K × $3/M    = $0.0066
  output:      500 × $15/M    = $0.0075
  小计 = $0.0444 × 9 = $0.400

10 次 session 合计 ≈ $0.793   ← 省 75%
```

**关键观察**：cache 只在"同一份长前缀被复用 ≥ 2 次"时回本。如果用户只问一个问题就走人，开 cache 反而亏 25%。生产里要根据用户行为分布动态决定是否开 cache——比如 **session 第 1 个问题不标 cache_control，从第 2 个问题开始才标**。

不过实际中，"反正写入贵 25%"的成本在长上下文场景常常远小于"延迟降低"带来的产品价值，所以大多数团队会无条件开 cache。

---

## Agent 多轮场景的 cache 布局

Agent 场景（function calling + 多轮）比单次问答更适合 cache，因为：
- system prompt 长（要写清楚 Agent 行为规范）
- tools 定义长（10 个工具的 JSON Schema 轻松上 5K token）
- 历史对话累积长

推荐结构：

```python
messages = [
    # cache breakpoint 1: 极稳定（system + tools）
    # 在 system 最后一个 block 标 cache_control，这样 system + tools 一起 cache
    {"role": "system", "content": [
        {"type": "text", "text": ROLE_AND_RULES},
        {"type": "text", "text": TOOL_USAGE_GUIDE, "cache_control": {"type": "ephemeral"}},
    ]},
    # 历史轮次（每轮追加，前面的仍然命中）
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "...(tool_use)..."},
    {"role": "user", "content": "...(tool_result)..."},
    # cache breakpoint 2: 在最后一轮 user message 之前标，把所有历史 cache 住
    {"role": "user", "content": [
        {"type": "text", "text": "[历史轮次的最后一个 turn]", "cache_control": {"type": "ephemeral"}},
        # ↑ 这个 breakpoint 让"截至上一轮"的全部对话被 cache
    ]},
    # 本轮新输入（不 cache）
]
```

这样每追加一轮，**所有前面的 turn 都从 cache 读**，只有最新一个 turn 是新算。

更详细的对话历史布局策略见 [对话历史管理](./history)。

---

## 容易踩的坑

### 陷阱 1：用动态字段污染 prefix 导致 cache 永远 miss

**现象**：开了 cache_control，但 `cache_read_input_tokens` 永远是 0。
**根因**：system prompt 里有时间戳、user_id、随机 ID 等动态字段。tokenization 后字节级不一致 → cache 失效。
**修法**：把所有动态字段移到 prompt 最末尾。如果必须放前面，至少保证它在每个 user 的 session 内不变（这样同一用户的多轮还能 cache）。

### 陷阱 2：达不到最低 token 门槛却以为开了 cache

**现象**：标了 cache_control，没报错，但 cache_read 一直是 0。
**根因**：Anthropic 要求至少 1024 token（部分模型 2048）才会真正缓存。短 prompt 标了也没用，但不会报错。
**修法**：监控 `cache_creation_input_tokens`——如果它在第 1 次请求就是 0，说明根本没被缓存。

### 陷阱 3：TTL 短于请求间隔，cache 反复写入

**现象**：`cache_creation_input_tokens` 每次都非零，没有 cache_read。
**根因**：Anthropic 默认 TTL 5 分钟。如果用户每次请求间隔超过 5 分钟（典型如"邮件助手批量处理"），每次都得重写。
**修法**：要么换 1 小时 TTL（贵 100% 写入），要么调整业务节奏（比如批处理时把 10 个任务串行紧凑发出）。

### 陷阱 4：cache miss 没有报警，悄悄涨成本

**现象**：上线时 cache 命中率 85%，3 个月后变成 30%，账单悄悄涨 3 倍。
**根因**：某次发版有人在 system prompt 里加了 `f"now: {datetime.now()}"` 或者改了模板里的换行，prefix 字节级变化。
**修法**：把 cache_read_ratio 加进监控大盘，设报警阈值（如低于历史均值 20% 持续 1 小时报警）。

### 陷阱 5：把 cache 当持久存储

**现象**：开发者以为"cache 1 小时"意味着保证 1 小时一定能读到。
**根因**：cache 是 best-effort 的，厂商内部可能因负载淘汰、节点故障丢失。TTL 是上限，不是下限。
**修法**：永远当成"可能 miss"——业务逻辑不能依赖 cache 一定命中，只是成本优化。

### 陷阱 6：用户专属数据放在共享 cache 段

**现象**：A 用户的对话历史被 cache 后，B 用户的请求命中了 A 的 cache（实际不会跨账号，但同账号内有这风险）。
**根因**：cache 是 prefix 匹配，如果你的 system prompt 里 hardcode 了某个用户的数据，理论上别的用户的请求只要前缀凑巧一致就能命中。
**修法**：永远不要把用户专属数据放进可能被共享的 cache 段。用户数据只在 messages 里出现。

---

## 面试题深度解析

### Q: prompt cache 和推理引擎的 prefix caching 是同一个东西吗？

**30 秒版本**：底层用的都是同一份 KV Cache 复用机制，但产品形态不同。**推理引擎的 prefix caching**（vLLM 的 `enable_prefix_caching`）是引擎内部的自动优化，你看不到、管不着、不计费——它的目的是让引擎在多并发场景下榨干显存利用率。**API 层的 prompt cache** 是厂商把这个能力包装成产品：你能显式标注 cache_control、看到 cache_read 字段、按命中折扣计费、设置 TTL。简单说，前者是基础设施的 perf 优化，后者是定价产品。

**追问**：那如果我自己部署 vLLM 暴露 OpenAI 兼容接口，能模拟 Anthropic 的 cache_control 吗？
能近似，但不完全等价。vLLM 开启 prefix caching 后会自动做 prefix matching，所以"相同 system prompt"的多个请求会命中——这部分行为类似。但 vLLM 的 cache 是 LRU 淘汰，没有 TTL 概念；也没有计费层（你自己算电费）；也不支持"显式标 breakpoint"。Anthropic 的产品形态本质上是把 vLLM-like 的能力 + 计费 + SLA + TTL 工程化暴露出来。

### Q: 为什么 cache 必须 prefix-match？能不能做更智能的 substring 匹配？

**30 秒版本**：因为 Transformer 是因果注意力——位置 t 的 K/V 张量依赖于位置 1..t 的所有 token，**换一个位置就要全部重算**。如果只是 prefix 一致，后面的 K/V 数值就完全一样，可以安全复用；但如果只是 substring 一致（比如把同一段文档放到 prompt 不同位置），由于位置编码 + 上下文不同，K/V 数值完全不一样，没法复用。

**追问**：那有没有研究在突破这个限制？
有。比如 **Prompt Cache: Modular Attention Reuse**（[arxiv 2311.04934](https://arxiv.org/abs/2311.04934)）尝试在某些约束下复用非前缀的 KV。**RAGCache**、**CacheBlend** 等系统级工作探索"把多个 chunk 的 KV 分别 cache、推理时按需拼"。但这些技术目前还在研究阶段，工业部署很少。原因：复用非前缀 KV 会导致输出和不 cache 的版本不一致（虽然差异小），生产级产品不愿意承担这种正确性风险。所以四家商用 API 全部坚持 prefix-only。

### Q: Anthropic 写入贵 25%、命中省 90%——什么场景反而亏？

**30 秒版本**：cache 写入一次需要被命中至少 (1.25 - 0.1) / (1 - 0.1) ≈ 1.28 次才回本。也就是说，**第 1 次写入后必须至少再被命中 1 次（任意命中比例）** 才划算。亏的场景：单次问答型（用户问完就走）、低频长文档分析（写完后 5 分钟内没有第二次请求，cache 直接过期）、prompt 频繁变动（每次写入都变成沉没成本）。

**追问**：那如何动态决策"这次要不要开 cache"？
工程上常见做法：**第一次请求不标 cache_control（不预付 25% 溢价），从第二次同 session 请求开始标**。这样：用户只问 1 个问题就走，没花冤枉钱；用户继续问，从第 2 个问题开始享受 cache 收益。但要注意——第 1 次不缓存意味着第 2 次想用 cache 时需要重新算并存，所以第 2 次会比"第 1 次就开"更慢更贵。所以更常见的做法还是"无脑全开"，把那 25% 当成"为了产品延迟体验付的保费"。

### Q: Agent 多轮场景下，cache 怎么布局命中率最高？

**30 秒版本**：分层放置——最稳定的在最前、最易变的在最后。典型顺序：(1) 角色 + 行为规则（永远不变）；(2) 工具定义（发版才变）；(3) Few-shot 示例（稳定）；(4) RAG 检索结果（session 内稳定）；(5) 历史 turn（追加不破坏 prefix）；(6) 当前 user 输入（必变，不 cache）。在 (1)+(2) 末尾标第 1 个 breakpoint，(3)+(4) 末尾标第 2 个，最近一轮历史末尾标第 3 个，剩 1 个 breakpoint 给可能的灵活场景。这样每轮新对话，cache_read 几乎是整段历史的长度，cache_write 只是新增的 user + assistant 两个 turn。

**追问**：那对话越长，cache 不就一直累积到上限了吗？
对，这就是为什么需要配合 [对话历史管理](./history) 的压缩策略。当对话超过某个长度（比如 50 轮）就触发摘要：把前 40 轮压成一个 summary text，重新作为"伪历史"的一部分。摘要后整个 prefix 变了——这次会 cache miss 一次（付一次写入溢价），之后又开始累积命中。所以真实生产里，cache 不是无限增长，而是"在压缩点之间反复积累 + 命中"的循环。

---

## 延伸阅读

- **官方文档：Anthropic Prompt Caching** ([docs.anthropic.com/en/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching))
  四家里写得最详细，明确给了写入 / 命中价格倍数、breakpoint 数量、TTL 选项。开 Anthropic cache 之前必读，定价数字以这里为准。

- **官方文档：Google Gemini Context Caching** ([ai.google.dev/gemini-api/docs/caching](https://ai.google.dev/gemini-api/docs/caching))
  讲 CachedContent API 设计、TTL 控制、存储计费模型。Gemini 把 cache 当资源对象的哲学只有读官方文档才看得清。

- **官方文档：DeepSeek Context Cache** ([api-docs.deepseek.com/guides/kv_cache](https://api-docs.deepseek.com/guides/kv_cache))
  解释自动 cache 的命中规则、定价折扣、返回字段。看完会理解为什么 DeepSeek API 单价能这么低。

- **官方文档：OpenAI Prompt Caching** ([platform.openai.com/docs/guides/prompt-caching](https://platform.openai.com/docs/guides/prompt-caching))
  OpenAI 自动 cache 的触发条件、最低 token、有效期细则。注意它的折扣是 50% 不是 90%，常被记混。

- **论文：Prompt Cache: Modular Attention Reuse for Low-Latency Inference** ([arxiv 2311.04934](https://arxiv.org/abs/2311.04934))
  Gim et al. 2023。读它是为了理解"突破 prefix-only 限制"的研究方向——为什么四家商用 API 没采用，理论上还能怎么做。

- **论文：vLLM / PagedAttention** ([arxiv 2309.06180](https://arxiv.org/abs/2309.06180))
  Kwon et al. 2023。理解推理引擎层 prefix caching 的实现，才能分清"API 层 cache"和"引擎层 cache"的边界。

- **博客：Anthropic — Prompt Caching with Claude** ([anthropic.com/news/prompt-caching](https://www.anthropic.com/news/prompt-caching))
  Anthropic 发布 cache 时的官方博客，含具体场景的 benchmark（书籍问答 90% 成本下降、Agent 多轮 80% 成本下降）。读它建立"cache 在哪些场景真值"的直觉。

- **配套阅读**：[长上下文模型对比](./long-context) — 长上下文 + cache 的组合是当前长文档产品的标配。[推理优化](../llm/inference-optimization) — KV Cache、PagedAttention 等底层基础设施。[对话历史管理](./history) — 多轮场景下 cache 失效与重建的策略。[系统提示词](../prompt/system-prompt) — system prompt 稳定性直接决定 cache 命中率。
