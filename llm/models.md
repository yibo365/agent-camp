---
title: 主流模型对比
description: GPT、Claude、Gemini、Llama、Qwen、DeepSeek 横向对比——技术路线、强弱场景、选型决策。
pageClass: llm-models-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">大模型基础</p>
  <h1>主流模型横向对比</h1>
  <p class="doc-hero__lead">GPT / Claude / Gemini / Llama / Qwen / DeepSeek——六大主流模型的技术路线、强弱场景、选型决策。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：选型决策</span>
    <span>核心链路：能力对比 + 价格 + 部署形态</span>
    <span>面试重点：差异背后的技术路线</span>
  </div>
</section>

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>GPT-4 / Claude / Gemini 在能力上各有什么强项？为什么会有差异？</strong>
    <span>考你能不能用一两个具体场景区分，而不是空说"都很强"。</span>
  </div>
  <div>
    <strong>Llama 3、Qwen、DeepSeek 这些开源模型，能力和闭源差距有多大？</strong>
    <span>考你跟得上开源进度，2024 后差距快速缩小。</span>
  </div>
  <div>
    <strong>MoE 架构是什么？为什么 DeepSeek-V3、Qwen3、Mixtral 都用 MoE？</strong>
    <span>考前沿架构理解，2024 后开源主流都转向 MoE。</span>
  </div>
  <div>
    <strong>推理模型（o1、R1、Claude Thinking）和普通对话模型本质区别是什么？</strong>
    <span>考对 reasoning-time compute scaling 的认知。</span>
  </div>
  <div>
    <strong>给定一个业务场景，怎么决定用哪个模型？决策依据有哪些？</strong>
    <span>考工程权衡，能不能给出 cost / latency / quality 多维决策框架。</span>
  </div>
  <div>
    <strong>同样规模的模型，为什么 DeepSeek 训练成本只有 GPT 的几十分之一？</strong>
    <span>考对 MoE + 训练效率优化的理解。</span>
  </div>
  <div>
    <strong>怎么用 LLM Arena、MMLU、HumanEval 等 benchmark？哪些可信、哪些有坑？</strong>
    <span>考评估方法论。</span>
  </div>
</div>

---

## 为什么这章重要

LLM 选型是 Agent 工程师天天面对的问题。"用 GPT-4 还是 Claude？" "Llama 能不能替代闭源模型？" "便宜的模型够用吗？"——这些问题没有标准答案，但有可循的决策框架。

本章不试图给"哪个最强"的排名（那会很快过时），而是讲清**每个模型的技术路线 + 适合的场景 + 选型决策维度**——让你在新模型发布时也能快速判断它适不适合你的业务。

---

## 六大主流模型一览（2025-2026）

| 模型家族 | 厂商 | 类型 | 强项 | 典型场景 |
|---|---|---|---|---|
| **GPT-4o / 4.1 / 5** | OpenAI | 闭源 API | 多模态、function calling 成熟 | 通用 Agent、工具调用 |
| **Claude Opus / Sonnet 系列** | Anthropic | 闭源 API | 长上下文、代码、写作质量 | 编程 Agent、长文档分析 |
| **Gemini 2.x Pro / Flash** | Google | 闭源 API | 超长上下文（2M+）、多模态 | 视频/音频分析、超长文档 |
| **Llama 4** | Meta | 开源权重 | 生态、社区微调资源 | 私有部署基线 |
| **Qwen 2.5/3** | 阿里 | 开源权重 | 中文优化、多尺寸完备 | 中文场景、私有部署 |
| **DeepSeek V3 / R1** | DeepSeek | 开源权重 | 性价比、推理能力 | 高性价比 + 推理 |

下面分别展开各家的技术路线和差异化。

---

## 闭源三巨头

### OpenAI: GPT 系列

**技术路线**：早期靠 scaling law 暴力堆参数（GPT-3 175B），中期靠 RLHF 对齐（InstructGPT、ChatGPT），近期靠"推理时间 scaling"（o1、o3 系列）和原生多模态（GPT-4o 同时处理文本/语音/图像）。

**强项**：
- function calling / tool use 工程最成熟，生态最全（OpenAI SDK 几乎是事实标准）
- 多模态（语音 / 视觉）能力领先
- 实时流式响应延迟低

**短板**：
- 长上下文质量不如 Claude / Gemini（128K 但实际有效利用率不如声称）
- 中文支持不如国产模型（虽然 GPT-4o 已大幅改善）
- 价格偏高

**典型用法**：通用 Agent、需要复杂 function calling 的产品、多模态应用。

### Anthropic: Claude 系列

**技术路线**：靠 Constitutional AI（RLAIF）做对齐，专注"helpful, harmless, honest"。Claude 3.5 Sonnet 之后明确把"编程能力"作为核心差异点，连续几代都在 SWE-bench 排第一。2024 后推出 Thinking 模式（reasoning model 范畴）。

**强项**：
- 编程能力：Cursor、Windsurf、Cline、Claude Code 都用它作为后端
- 长上下文质量：200K 上下文实际有效信息利用率高
- 写作风格：长文写作的连贯性、准确性最强
- 拒绝"奉承式回答"（不会无脑同意用户错误观点）

**短板**：
- 多模态弱于 GPT（虽然支持图像，但远不如 GPT-4o）
- 在中国大陆需要中转，时延高
- function calling 不如 OpenAI 成熟（但 2024 后差距快速缩小）

**典型用法**：编程 Agent、长文档分析、需要严格遵守复杂指令的场景。

### Google: Gemini 系列

**技术路线**：依托 Google 的 TPU + 多模态数据优势，主打"原生多模态 + 超长上下文"。Gemini 1.5 Pro 首先把上下文拉到 1M token，2.0 进一步到 2M。

**强项**：
- 超长上下文：2M token，能塞下整本《战争与和平》× 5
- 视频原生理解：一段视频直接当输入分析
- 价格：Flash 系列在主流模型里最便宜
- TPU 训练成本控制（不依赖 NVIDIA）

**短板**：
- 推理能力（数学、复杂逻辑）相对弱于 GPT-4o / Claude
- 工具调用生态成熟度不如 OpenAI
- 长上下文时质量也有衰减（不能盲信"塞 2M 还很准"）

**典型用法**：超长文档分析、视频理解、对成本敏感的场景。

---

## 开源三强（2024-2025）

### Meta: Llama 系列

**技术路线**：Llama 1（2023 Feb）打开开源 LLM 时代，2/3/4 持续迭代。Meta 不做闭源 API，专注"开源标杆"。

**强项**：
- 生态最大：HuggingFace 上数万个基于 Llama 的微调模型
- 工具链最完善：vLLM、TGI、llama.cpp 第一时间支持
- 训练数据透明度高（虽然实际数据不开源）

**短板**：
- 中文偏弱（训练数据英文为主）
- 推理能力在同 size 开源模型里不再领先（Qwen、DeepSeek 后来居上）
- Multimodal 版本（Llama-Vision）效果一般

**典型用法**：英文为主的私有部署基线，需要广泛社区微调资源时。

### 阿里：Qwen 系列

**技术路线**：从 Qwen 1.5 开始系统迭代，2024 年 Qwen 2.5 全面对齐 GPT-4 同尺寸水平，2025 年 Qwen 3 引入 MoE + Thinking 模式。最大特色：**尺寸完备**——从 0.5B、1.5B、3B、7B、14B、32B、72B 到 110B+ MoE，每个尺寸都有。

**强项**：
- 中文 SOTA：在中文场景常超过同 size 的 Llama
- 尺寸完备：从手机端 0.5B 到数据中心 110B，覆盖所有部署需求
- 多模态版本完整：Qwen-VL、Qwen-Audio、Qwen-Omni
- License 商用友好

**短板**：
- 推理深度（数学、复杂逻辑）不如 DeepSeek-R1
- 工具调用稳定性略弱于闭源模型

**典型用法**：中文场景私有部署、需要端侧/边缘部署的小尺寸场景。

### DeepSeek: V3 + R1

**技术路线**：2024 年靠极致的训练效率优化（H800 而非 H100、自研通信、MoE 架构）做出 GPT-4 级模型，成本仅 600 万美元（OpenAI 数十亿）。R1 通过纯 RL（GRPO 算法）+ 长 CoT 训练做出对标 o1 的推理模型，且开源权重。

**强项**：
- 性价比之王：API 价格远低于其他厂商，自部署成本最低
- 推理能力：R1 是首个开源的"o1 级"推理模型
- 训练效率：用 1/10 的算力达到同 tier 模型水平
- MoE 架构成熟：671B 总参数 / 37B 激活参数，推理成本接近 37B 模型

**短板**：
- 多模态较弱（主要做语言）
- function calling 不如 OpenAI 成熟
- 海外部署受限（中国公司）

**典型用法**：高性价比的中英文应用、推理任务、要求开源权重的私有部署。

---

## 关键技术路线：MoE

2024 年后开源模型几乎全转 MoE（Mixture of Experts）。理解 MoE 是看懂当前模型对比的前提。

**传统 dense 模型**：每个 token 都激活全部参数。70B 模型 → 每次推理算 70B FLOPs。

**MoE 模型**：模型由"专家"组成（典型 8-256 个），每个 token 只激活 top-2 个专家（router 决定）。Mixtral 8×7B（47B 总参数 / 13B 激活），DeepSeek-V3（671B 总参数 / 37B 激活）。

```
传统 dense Transformer Block:
  Input → Attention → FFN → Output
                       ↑
                  整层都参与计算

MoE Transformer Block:
  Input → Attention → Router → 选 top-2 个 expert FFN → Output
                                ↑
                          只算被选中的，其他闲着
```

**为什么 MoE 这么火？**

1. **训练时全部参数都更新**——表征能力 ≈ 总参数量的 dense 模型
2. **推理时只算激活参数**——推理速度 ≈ 激活参数量的 dense 模型
3. **同样推理成本下，效果更好**

**代价**：
- 显存占用还是按总参数算（MoE 模型不省显存，只省算力）
- 训练复杂（router 调度、负载均衡、专家容量）
- 推理时 router 分发增加 overhead

DeepSeek-V3 是把 MoE 用到极致的代表——600 万美元做出 GPT-4o 水平的核心原因就是 MoE 的训练效率。

---

## 推理模型：另一个新维度

2024 年 9 月 OpenAI 发 o1，开启了 LLM 的新分类：**推理模型** (reasoning model)。

**核心区别**：
- **普通 LLM**：直接输出答案
- **推理模型**：先生成大量"思考过程"（chain of thought），再给最终答案

```
普通 LLM:
  Question: 13 × 17 = ?
  Answer: 221

推理模型:
  Question: 13 × 17 = ?
  Thinking: Let me think...
    13 × 17 = 13 × (10 + 7)
           = 130 + 91
           = 221
    Let me verify: 13 × 17... yes 221.
  Answer: 221
```

**怎么训出来的**：不是简单 prompt 提示"think step by step"，而是用 RL（特别是 GRPO 算法）让模型自己学会"在思考中纠错"。DeepSeek-R1 论文（[arxiv 2501.12948](https://arxiv.org/abs/2501.12948)）公开了完整训练 recipe。

**主流推理模型**：
- OpenAI o1 / o3 系列
- DeepSeek-R1
- Claude Opus / Sonnet 的 Thinking 模式
- Qwen3 的 thinking 版本
- Gemini 2.x Thinking

**适合场景**：
- 数学、逻辑、代码（推理能链长）
- 复杂规划
- 需要避免错误的高 stakes 决策

**不适合场景**：
- 简单事实问答（用大炮打蚊子）
- 创意写作（推理过程反而干扰创意）
- 低延迟场景（推理动辄输出几千 token）

---

## 选型决策框架

不要问"哪个模型最强"，要问"在我的约束下哪个最合适"。常见的决策维度：

### 1. 部署形态约束
- **必须私有部署**（合规/数据敏感）→ Llama / Qwen / DeepSeek（开源）
- **能用 API**（成本/快速迭代）→ GPT / Claude / Gemini

### 2. 任务类型
- **代码 Agent** → Claude（Sonnet/Opus）/ GPT 系列 / DeepSeek-V3
- **多模态** → GPT-4o / Gemini 系列
- **长文档** → Claude 200K / Gemini 1M+
- **复杂推理** → o1 / R1 / Claude Thinking
- **简单聊天** → 任何中等模型都够

### 3. 语言
- **中文为主** → Qwen / DeepSeek > 国外模型（不论质量还是 token 成本）
- **英文为主** → 都可，国外模型略优

### 4. 成本
- 单价高低：闭源 > 开源（自部署，分摊后远低）
- 高频调用 → 自部署开源 + 优化推理引擎
- 低频调用 → 直接 API（不用维护推理基础设施）

### 5. 延迟
- 实时对话 → Flash / Sonnet / Haiku 等"轻量级"模型
- 异步任务 → 用最强的模型，延迟不敏感

### 6. function calling 复杂度
- 复杂 tool use → OpenAI > Anthropic > Gemini > 开源
- 简单 tool use → 都可

### 一个常见组合：分层模型策略

不是所有请求都用最强模型。生产里常见的策略：

```python
def smart_routing(query):
    if is_simple(query):
        return call_haiku(query)        # 便宜快速
    elif requires_reasoning(query):
        return call_o1(query)            # 推理模型
    else:
        return call_claude_sonnet(query) # 通用主力
```

这种 routing 能在保证质量的同时把成本压到只用最强模型的 20-30%。

---

## 怎么评估模型

### 公开 Benchmark 一览

| Benchmark | 测什么 | 可信度 | 坑 |
|---|---|---|---|
| **MMLU** | 通用知识（57 学科选择题） | 高 | 已被各家"针对性优化"，区分度下降 |
| **HumanEval** | Python 函数补全 | 中 | 数据简单，不代表真实编程能力 |
| **SWE-bench** | 真实 GitHub Issue 修复 | 高 | 当前最有区分度的代码 benchmark |
| **GSM8K / MATH** | 数学应用题 | 高 | 区分推理模型有效 |
| **MT-Bench / Arena Hard** | 多轮对话质量（LLM-as-judge） | 中 | LLM judge 有偏好 |
| **LMSys Chatbot Arena** | 真人盲测投票 | 高 | 整体最可信，但偏好"讨喜"风格 |
| **Needle in a Haystack** | 长上下文检索 | 中 | 简单任务，过不了的模型差 |

### 选型评估建议

1. **永远在自己业务数据上评测**——公开 benchmark 只用来粗筛
2. **建立 50-100 条业务核心 case**——含 happy path + 边界 + 异常
3. **A/B test 多个候选模型**，记录 (accuracy / latency / cost / failure modes)
4. **定期重测**——新模型发布快，每 2-3 个月重评一次值得

---

## 常见陷阱

### 陷阱 1：只看 benchmark 选模型

MMLU 88 分的模型未必比 85 分的好用——可能后者在你的业务场景反而更稳。Benchmark 是"通用智力测试"，不替代场景实测。

### 陷阱 2：以为开源 = 永远便宜

自部署 70B 模型至少需要 1-2 张 A100/H100，月成本数万。如果调用量小，**API 反而便宜**。开源真正划算是在高频调用（日 100 万次以上）场景。

### 陷阱 3：迷信"最新最强"模型

新发布的模型经常有"蜜月期 bug"——function calling 不稳定、某些边界 case 出错。生产环境**等 2-4 周看社区反馈**再切换是稳妥的。

### 陷阱 4：不区分 base 和 instruct 版本

开源模型同时发 base、instruct、chat 多个版本。生产里调对话用 instruct/chat，做 fine-tune 用 base。混了会出问题。

### 陷阱 5：忽略 license 风险

Llama 系列有"商业用户超过 7 亿月活需要单独 license"。Qwen、DeepSeek、Mistral 等多数是 Apache 2.0 商用友好。**生产部署前必读 license**。

### 陷阱 6：不看价格的"含输入"和"含输出"

OpenAI/Anthropic 定价 input 和 output 分开计算（output 通常贵 3-5 倍）。RAG 场景输入很长输出很短，看 input 价；创意写作场景输入短输出长，看 output 价。混淆会算错成本一倍以上。

---

## 面试题深度解析

### Q: GPT、Claude、Gemini 在能力上各有什么强项？为什么差异这么大？

**30 秒版本**：GPT 强在**工具调用生态和多模态**——function calling SDK 最成熟，GPT-4o 原生处理语音/视觉/文本；Claude 强在**编程和长上下文质量**——Cursor/Cline 等编程 agent 都默认它，200K 上下文的实际利用率高；Gemini 强在**超长上下文和视频理解**——2M token，原生视频输入。差异源于各家的训练数据 mix、对齐目标、产品定位——OpenAI 全能但通用、Anthropic 聚焦深度任务、Google 利用自家数据优势。

**追问 1**：那为什么不能"取百家之长"做一个全能模型？
能力之间存在 trade-off。专门优化代码能力会挤占创意写作的训练资源；激进的多模态训练可能损害纯文本质量；推理 RL 训练可能让模型在简单任务上"过度思考"。每家公司有产品优先级，资源分配不同，结果就分化了。GPT-5 之类的"下一代旗舰"试图全面突破，但实际仍有侧重。

**追问 2**：未来这种分化会消失吗？
短期不会，长期可能。短期：模型能力还在快速迭代，各家会进一步强化差异化优势；长期：当能力接近上限，差异化会从"模型本身"转移到"工具生态、价格、合规、易用性"。3-5 年内仍然是"几个模型并存、按场景选型"的格局。

### Q: MoE 架构的本质优势是什么？为什么 2024 后开源主流都转 MoE？

**30 秒版本**：MoE 让模型在**训练时拥有大参数容量、推理时只激活小部分参数**。DeepSeek-V3 总参数 671B 但每 token 只激活 37B——表征能力接近 dense 671B，推理成本接近 dense 37B。在"算力比显存便宜得多"的当前阶段，这个 trade-off 非常划算。开源社区转 MoE 是因为：(1) DeepSeek 等先驱证明了可训练性；(2) 没有专门优化基础设施的小团队也能跑出顶级模型。

**追问 1**：MoE 不省显存，会带来什么问题？
最大的问题是部署门槛——671B 参数即使 4-bit 量化也要 168 GB，需要多卡或大显存机型。这让 MoE 在边缘部署、个人用户场景反而不友好。所以同期开源社区也有 dense 路线（Llama 4 系列）——MoE 适合数据中心，dense 适合边缘。

**追问 2**：router 选错专家怎么办？训练时怎么保证负载均衡？
两个机制：(1) **auxiliary loss**——加一项惩罚专家激活不均的 loss，强迫 router 分散；(2) **expert capacity**——每个专家有最大容量，超出就转给次优。DeepSeek-V3 在论文里详细讲了 "auxiliary-loss-free load balancing"——他们发现 aux loss 会损害模型质量，改用 bias term 动态调整 router。这个细节是 V3 训练效率的关键之一。

### Q: 同样规模的模型，DeepSeek 训练成本只有 GPT 的几十分之一，怎么做到的？

**30 秒版本**：四个层面叠加：(1) **MoE 架构**——同等能力推理成本是 dense 的 1/5；(2) **训练算力优化**——FP8 训练、自研通信库 DualPipe、跨节点 All-to-All 优化；(3) **数据质量**——精筛过的训练数据让每 token 学习效率更高；(4) **架构创新**——MLA (Multi-head Latent Attention) 把 KV Cache 压到 GQA 的 1/4。这些优化叠加，让训练 671B 模型只用 2048 张 H800 跑两个月、成本约 600 万美元。

**追问**：那 OpenAI 知道这些技术吗？为什么他们还花那么多钱？
OpenAI 知道（很多技术他们更早发现）。OpenAI 训练成本高的原因：(1) 持续做大量"探索性"训练（试新架构、新对齐方法），失败的也算成本；(2) 闭源 RLHF 涉及大规模人工标注，成本远高于纯算法训练；(3) 商业模式上他们靠 API 收入，能 cover 这个成本——不需要追求极致效率。DeepSeek 的"低成本奇迹"很大程度上是站在 OpenAI 试错的肩膀上 + 极致工程优化。

### Q: 给定一个业务场景，决策模型时主要看什么？

**30 秒版本**：六维决策框架：(1) **部署约束**（必须私有 vs 可用 API）；(2) **任务类型**（代码 / 多模态 / 长文档 / 推理 / 通用）；(3) **语言**（中文 vs 英文）；(4) **成本**（单价 + 调用量）；(5) **延迟**（实时 vs 异步）；(6) **复杂度**（普通对话 vs 复杂 tool use）。给一个具体例子：做一个 To-C 中文客服 Agent → 中文好 + 实时响应 + 简单 tool use → 候选：Qwen2.5-7B-Instruct（自部署）或 Doubao（API）。

**追问**：模型迭代这么快，怎么持续做决策？
两个机制：(1) **分层架构**——业务代码不直接绑定某个模型 API，中间加一层路由，方便切换；(2) **持续 A/B test**——新模型发布后用业务核心 case 评测，效果显著好就切。生产里常见的策略是"主力模型 + 备用模型"——主力跑生产、备用持续评估，差距足够大时切换。

---

## 延伸阅读

- **论文：DeepSeek-V3 Technical Report** ([arxiv 2412.19437](https://arxiv.org/abs/2412.19437))
  完整公开 MoE 训练 recipe、MLA 设计、FP8 训练、DualPipe 通信。读它是为了理解"600 万美元做出 GPT-4 级模型"的所有工程细节。

- **论文：DeepSeek-R1** ([arxiv 2501.12948](https://arxiv.org/abs/2501.12948))
  首个开源的"o1 级"推理模型。读它是为了理解"用纯 RL（GRPO）训出推理能力"的完整 pipeline——以及为什么 R1-Zero 那个无 SFT 起步的实验如此震撼。

- **论文：Mixtral of Experts** ([arxiv 2401.04088](https://arxiv.org/abs/2401.04088))
  Mistral 把 MoE 推向主流的论文。读它是为了入门 MoE 的工程实现细节。

- **博客：Anthropic — Claude's Constitution** ([anthropic.com/news/claudes-constitution](https://www.anthropic.com/news/claudes-constitution))
  Anthropic 公开 Claude 的"宪法"原则。看它是为了理解 Claude 的对齐路线为什么和 GPT 不同。

- **排行榜：LMSys Chatbot Arena** ([lmarena.ai](https://lmarena.ai/))
  真人盲测的模型对决榜，目前公认最有参考价值的综合榜单。常态跟踪能让你对模型相对水平有体感。

- **排行榜：SWE-bench** ([swebench.com](https://www.swebench.com/))
  真实 GitHub Issue 修复评测，区分模型编程能力最有效。看它能知道你的编程 Agent 该用哪个模型。

- **博客：Karpathy — Intro to LLMs** ([youtube.com/karpathy](https://www.youtube.com/@AndrejKarpathy))
  Karpathy 系列视频。看一遍能建立对各家模型差异、训练流程、能力来源的整体直觉。
