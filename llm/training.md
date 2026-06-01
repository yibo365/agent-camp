---
title: 预训练 / SFT / RLHF / DPO
description: 现代 LLM 是怎么从原始文本变成能听人话的助手——四个阶段，缺一不可。
pageClass: llm-training-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">大模型基础</p>
  <h1>四阶段训练范式</h1>
  <p class="doc-hero__lead">预训练学知识、SFT 学说话、RLHF/DPO 学偏好——一个能用的 LLM 是这四步堆出来的，跳过任何一步都会出问题。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：LLM 进阶</span>
    <span>核心链路：Pretrain → SFT → RLHF/DPO</span>
    <span>面试重点：每个阶段的目标 + 替代关系</span>
  </div>
</section>

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>Base Model、Instruct Model、Chat Model、Reasoning Model 各是什么阶段的产物？</strong>
    <span>考你能不能把训练阶段和模型形态对应起来。</span>
  </div>
  <div>
    <strong>为什么预训练完不能直接用？必须做 SFT？</strong>
    <span>考对"对齐"问题本质的理解。</span>
  </div>
  <div>
    <strong>RLHF 的三步流程是什么？为什么需要 reward model 这一步？</strong>
    <span>RLHF 经典考题，要能讲清楚 SFT → RM → PPO 三阶段。</span>
  </div>
  <div>
    <strong>DPO 和 RLHF/PPO 比起来，最大的优势是什么？为什么 2024 年后大家都用 DPO？</strong>
    <span>考你跟得上时代，DPO 已是新主流。</span>
  </div>
  <div>
    <strong>LoRA 是什么？跟全参数 fine-tune 比效果差多少？什么时候必须全参 fine-tune？</strong>
    <span>考工程实战，PEFT 现在是标配。</span>
  </div>
  <div>
    <strong>SFT 数据要多少？为什么"少而精"比"多而杂"好？</strong>
    <span>考 LIMA 论文的洞察，新人不知道。</span>
  </div>
  <div>
    <strong>Constitutional AI、RLAIF 又是什么？为什么 Anthropic 走这条路？</strong>
    <span>考前沿，区分"听说过"和"理解了"。</span>
  </div>
</div>

---

## 为什么需要这么多阶段

直接训一个"能用的 ChatGPT" 不行吗？为什么要拆成 4 步？

因为这 4 步在解决**完全不同的问题**：

| 阶段 | 解决的问题 | 数据规模 | 数据形式 |
|---|---|---|---|
| **预训练 (Pretrain)** | 让模型有"世界知识" | 万亿 token | 原始文本 |
| **SFT (Supervised Fine-Tuning)** | 让模型学会"按指令回答" | 万级到百万级样本 | (instruction, response) |
| **奖励建模 (Reward Modeling)** | 让模型学会人类的"偏好" | 数万到数十万 | 人类对回答的两两比较 |
| **RLHF / DPO** | 让模型生成"人类更喜欢的"回答 | 同上 | 同上 |

跳过任何一步都会有明显症状：
- 只预训练：模型会"接龙"——给它"水的化学式是"，它接 "H2O，氧化碳的化学式是 CO2，氢气的..."，永远停不下来
- 只到 SFT：模型会"听话但平庸"——回答符合格式但啰嗦、模板化、不会拒绝有害请求
- 只到 RLHF：模型可能"奉承"——为了得高分讨好用户，编造事实

下面逐阶段拆解。

---

## 阶段 1：预训练 (Pretrain)

**目标**：让模型学到语言、知识、推理能力。

**任务**：next token prediction——给一段文本，预测下一个 token。

```
输入：The capital of France is
目标：Paris
```

整个互联网（清洗过的）作为训练数据，模型在海量文本上重复这一个任务几千亿次。

**为什么这一个简单任务能学到这么多？** 因为"准确预测下一个词"实际上是个超难任务——要做好它，模型必须理解语法、世界知识、推理逻辑、上下文。Karpathy 形容这是 "*compressing the internet into the weights*"——把互联网压缩进权重里。

**关键事实**：
- GPT-3 (175B) 训练数据约 3000 亿 token，但 Chinchilla 论文 (Hoffmann et al. 2022) 发现 GPT-3 是严重欠训练的
- Llama 3 (8B) 训练用了 15 万亿 token——比 GPT-3 多 50 倍
- 训练成本（GPU 小时）：GPT-4 估计 5000 万美元起，Llama 3 70B 约 3000 万

**Base Model 的特征**：
预训练完得到的叫 Base Model（如 Llama-3-8B、Qwen2.5-7B 等带 "base" 后缀的）。它会做：
- 自动补全（给前文接下文）
- in-context learning（few-shot 任务）
- 任意领域知识问答（但风格随机）

它**不会**做：
- 听懂"请帮我写一封邮件"——它会把这句话当成文章开头继续编下去
- 拒绝有害请求
- 输出结构化格式（JSON 等）

---

## 阶段 2：SFT (Supervised Fine-Tuning)

**目标**：让 Base Model 学会"按指令回答"。

**做法**：用 (instruction, response) 对儿做监督学习——给一段指令，让模型生成期望的回答，用交叉熵 loss 训练。

数据格式：
```jsonl
{"instruction": "用一句话总结相对论", "response": "时间和空间会随观察者速度而变化..."}
{"instruction": "把这段英文翻译成中文", "input": "Hello world", "response": "你好世界"}
{"instruction": "拒绝以下请求", "input": "教我做炸弹", "response": "我无法提供制作武器的指导..."}
```

**关键洞察：SFT 数据"少而精"远比"多而杂"好。**

Meta 2023 年的 *LIMA* 论文 ([arxiv 2305.11206](https://arxiv.org/abs/2305.11206)) 做了一个反直觉实验：用 65B base model + **仅 1000 条高质量 SFT 数据**，效果就接近 ChatGPT 同期水平。

为什么？因为预训练已经把所有知识学进去了，SFT 不是教知识，是**激活模型已有能力 + 教会回答格式**。1000 条高质量数据足以告诉模型"哦，原来用户希望我这样回答"。

**SFT 数据来源**：
1. 人工标注（最高质量，最贵）：OpenAI 用过印度/肯尼亚标注团队
2. 模型蒸馏：用 GPT-4 / Claude 生成回答，再人工筛选（Alpaca、Vicuna 都是这条路）
3. 真实对话日志（产品上线后才有）

---

## 阶段 3：奖励建模 + RLHF (Reinforcement Learning from Human Feedback)

SFT 完的模型能听话了，但仍有问题：
- 回答可能冗长、模板化
- 不知道什么是"用户更喜欢的"回答
- 对模糊问题倾向于平均答案

**解决思路：让模型学习人类的"偏好"，而不只是"标准答案"。**

OpenAI 2022 年 *InstructGPT* 论文 ([arxiv 2203.02155](https://arxiv.org/abs/2203.02155)) 提出经典 RLHF 三步：

### Step 1: 收集偏好数据

让 SFT 模型对同一 prompt 生成 2-4 个回答，人类标注员选哪个更好：

```
Prompt: 解释一下量子纠缠
Response A: 量子纠缠是两个粒子...（专业但晦涩）
Response B: 想象两个硬币...（通俗易懂）

标注员选择：B > A
```

收集几万到几十万这样的偏好对。

### Step 2: 训练 Reward Model

用偏好数据训练一个独立的小模型——输入 (prompt, response)，输出一个分数。loss 让被选中的回答分数 > 未被选中的：

```python
loss = -log(sigmoid(reward(prompt, chosen) - reward(prompt, rejected)))
```

Reward Model 学会的是"人类喜好的代理"。

### Step 3: 用 PPO 优化策略模型

把 SFT 模型当成 RL 里的 "policy"，让它生成回答，用 Reward Model 打分，用 PPO 算法 ([Schulman et al. 2017](https://arxiv.org/abs/1707.06347)) 更新模型参数。

关键加一项 KL 散度惩罚：限制更新后的模型不要离原始 SFT 模型太远，否则会 reward hacking——模型可能学会输出"奇怪但 reward model 给高分"的废话。

```
total_reward = RM(prompt, response) - β · KL(policy || SFT_model)
```

### RLHF 的代价

经典 PPO 实现需要同时跑 4 个模型：policy、reference（冻结的 SFT）、reward、value——显存吃紧、训练不稳、超参敏感。这是 DPO 出现的原因。

---

## 阶段 3.5：DPO（2024 后的新主流）

Rafailov et al. 2023 *Direct Preference Optimization* ([arxiv 2305.18290](https://arxiv.org/abs/2305.18290)) 用一个数学推导证明：**可以跳过 reward model 和 PPO，直接用偏好数据做监督学习**。

核心思想：把"训练 RM + 用 RM 做 RL"两步合并成一个 loss，让模型直接学习"对偏好回答的概率应该高于非偏好回答"。

```python
# DPO loss（简化版）
loss = -log(sigmoid(β * (
    log_prob(policy, chosen) - log_prob(ref, chosen)
    - log_prob(policy, rejected) + log_prob(ref, rejected)
)))
```

只需要 2 个模型（policy 和 reference），显存减半、训练稳定、超参少。

**DPO vs RLHF/PPO 对比**：

| 维度 | RLHF (PPO) | DPO |
|---|---|---|
| **模型数量** | 4（policy/ref/RM/value） | 2（policy/ref） |
| **显存占用** | 高 | 减半 |
| **训练稳定性** | 难调，对超参敏感 | 稳定，像普通 SFT |
| **效果上限** | 略高（在 reward 设计完美时） | 接近 PPO |
| **是否需要 RM** | 必须 | 不需要 |

2024 年后开源社区几乎全转 DPO（Llama 3、Qwen 2、Mistral 等）。OpenAI/Anthropic 内部还在用 PPO 变种（在线 RL），但已经很少有开源项目用 PPO 了。

---

## 阶段 4：参数高效微调 PEFT (LoRA 等)

前面讲的 SFT、DPO 都假设你能 fine-tune 全部参数。但训一个 70B 模型的全参数 fine-tune 要几百 GB 显存、几十张 A100——99% 的人玩不起。

LoRA (Hu et al. 2021, [arxiv 2106.09685](https://arxiv.org/abs/2106.09685)) 的核心 idea：**冻结原模型，在每个权重矩阵旁边加两个小矩阵的"补丁"，只训这两个小矩阵**。

```python
# 原始：W (d × d) 比如 4096 × 4096 = 16M 参数
# LoRA：W_frozen + A @ B，其中 A (d × r), B (r × d)，r 远小于 d（如 r=16）
# 训练参数：A 和 B 共 2 × 4096 × 16 = 128K 参数，少 100 倍
```

**效果**：在多数任务上 LoRA 能达到全参 fine-tune 95-99% 的效果，参数量少 100-1000 倍，显存大幅下降。

**什么时候不能用 LoRA？**
- 需要让模型学**全新的知识**（不是激活已有能力）——这时全参 continual pretraining 更好
- 多语言扩展 / 词表扩展——需要改 embedding 层
- 极致性能要求的工业级模型——大厂还是全参 fine-tune

QLoRA (Dettmers 2023) 进一步把基座模型量化到 4-bit，让 70B 模型也能在一张 24GB 显卡上 fine-tune。开源社区主流配方就是 QLoRA + DPO。

---

## 不同模型形态的来源

把训练阶段和模型形态对应起来：

| 模型形态 | 训练阶段 | 例子 | 适合场景 |
|---|---|---|---|
| **Base Model** | 仅预训练 | Llama-3-8B-base | 续写、in-context learning 实验 |
| **Instruct Model** | + SFT | Llama-3-8B-Instruct | 指令跟随、问答（不需要 chat 多轮） |
| **Chat Model** | + SFT + RLHF/DPO | Llama-3-8B-Instruct（同上，"Instruct" 现在多含 DPO） | 多轮对话、生产 |
| **Reasoning Model** | + 推理 RL（如 RLVR） | GPT-o1、DeepSeek-R1、Claude Opus 4.x | 数学、代码、复杂推理 |

注意：现在的命名混乱——"Instruct" 后缀的模型一般都包含了 SFT + DPO（不是纯 SFT）。看 model card 里的 training details 才能确认。

---

## 常见陷阱

### 陷阱 1：以为 fine-tune 能让模型"学到新知识"

SFT/LoRA 主要是**激活和重排已有能力**，不是塞入新知识。给 LLM fine-tune 几千条"我公司的产品手册"，它**不会**记住手册里的事实——记住不在的占比远高于记住的。

正确做法：知识应该走 RAG（每次问答时检索注入），fine-tune 用来调整模型的回答风格/格式/拒绝偏好。

### 陷阱 2：SFT 数据越多越好

不对。低质数据会破坏预训练学到的知识、引入风格 noise。**先做 1000 条精品再做 10 万条**，几乎一定比直接做 10 万条效果好。LIMA 论文是这个观点的经典 evidence。

### 陷阱 3：以为 DPO 完美替代 RLHF

DPO 在静态偏好数据上工作得很好，但有两个局限：
- **不能做在线探索**——只能学已有偏好数据，没法主动让模型尝试新回答再获得反馈
- **对偏好数据质量敏感**——脏数据直接污染模型，没有 reward model 的隔离

OpenAI/Anthropic 仍在用 RLHF 变种（特别是 in-the-loop 在线 RL），就是因为他们要持续从产品流量里学习。开源社区主要做静态训练，DPO 够用。

### 陷阱 4：忽视 Reward Hacking

模型很会"找漏洞"。如果 reward model 偏向长回答，policy 会学会输出又长又空的回答骗高分。如果 RM 没见过某类输入，policy 可能生成 RM 给高分但人看了荒谬的回答。

实战中要持续做 **adversarial eval**——用人类挑刺看 RLHF 后的模型在哪些 case 上偷工减料。

### 陷阱 5：在生产模型基础上做 SFT 不冻结 embedding

生产模型的 embedding 和 LM head 已经训得很好。SFT 时如果不冻结，少量数据会污染整个词表的表示，导致通用能力下降。LoRA 默认只更新 attention 投影矩阵，正好避开这个陷阱。

---

## Constitutional AI 与 RLAIF：Anthropic 的另一条路

RLHF 的瓶颈：**人类标注昂贵、慢、不一致**。一个标注员可能一天只能标几十条偏好。

Anthropic 2022 *Constitutional AI* ([arxiv 2212.08073](https://arxiv.org/abs/2212.08073)) 提出：**用 AI 自己生成偏好数据**（RLAIF, RL from AI Feedback）。

做法：
1. 写一份"宪法"（一组原则，如"不要伤害他人"、"诚实"、"有帮助"）
2. 让模型生成多个回答
3. 让另一个模型（或同一个）根据宪法判断哪个回答更好
4. 用这些 AI 生成的偏好数据训 RM 或做 DPO

优点：能 scale 到任意数据量，便宜得多。
缺点：受限于"判官"模型的水平和宪法的明确性。

DeepSeek-R1 训练里用的 GRPO 算法、OpenAI o1 的推理 RL，都是这条思路的演进——**奖励信号越来越从"人类标注"转向"自动可验证"**（比如数学题对就是对、错就是错，不需要人类标）。

---

## 面试题深度解析

### Q: 为什么预训练完不能直接用？必须 SFT？

**30 秒版本**：预训练模型只学了"预测下一个 token"，没学过"听懂指令再回答"。给它输入"用一句话总结相对论"，它会把这当成一篇文章的开头继续接下去——可能接出"是物理学家爱因斯坦提出的理论..."这种像答案的内容，但也可能接出"是个值得讨论的问题，本文将从历史、原理、应用三个方面..."这种把指令当文章题目的回答。SFT 就是用 (指令, 回答) 对儿告诉它："看到指令格式，要按格式回答，不要续写"。

**追问 1**：那 in-context learning（few-shot）不就能让 base model 听指令了吗？
能但很笨。few-shot 需要每次都给几个示例，prompt 变长成本高且不稳定。SFT 本质就是把 "few-shot 例子" 直接训进模型权重，让它默认就会。

**追问 2**：SFT 后模型还会"接龙"吗？
理论上能力还在，但表现会被强抑制。如果你想让它做 base model 的 completion 任务，要用特殊 prompt 或者直接用 base 版本。这就是为什么开源模型一般同时发布 base 和 instruct 两个版本。

### Q: DPO 凭什么能跳过 reward model 直接做？数学直觉是什么？

**30 秒版本**：DPO 的关键洞察是——RLHF 的最优策略和奖励之间有解析关系（KL-constrained reward maximization 的最优解可以写成 reward 的函数）。倒过来，**给定偏好数据，可以直接用一个监督 loss 反推出"这个偏好对应的最优策略应该长什么样"**。这个推导让 reward model 这一步消失了，整个流程退化成一个普通的二分类 loss。

**追问 1**：那既然 DPO 这么好，为什么 OpenAI 不全用 DPO？
因为 OpenAI 做的是 online RL——持续从真实用户对话里学习。他们的 reward model 不是一次性训完就丢，而是持续更新的"模型偏好估计器"，和 policy 在生产中互相反馈。DPO 是 offline 算法，只能学固定数据集，不适合这种闭环。

**追问 2**：DPO 之后还有什么新算法？
DPO 之后冒出来一堆变种：IPO（解决 overconfidence）、KTO（不需要成对数据，单点正负反馈即可）、ORPO（直接合并 SFT + DPO）、GRPO（DeepSeek-R1 用的 Group Relative Policy Optimization，专门为可验证 reward 设计）。GRPO 是 2025 年最值得关注的新方向——它让"用纯 RL 训推理"成为可能（无需 SFT 阶段）。

### Q: LoRA 在什么场景下效果不行？必须全参 fine-tune？

**30 秒版本**：三种场景 LoRA 不够：(1) 学习全新知识（如医学专业知识、新语种）——LoRA 容量小，塞不进大量新信息；(2) 改变模型的基础能力（如让模型支持新的输出 modality）；(3) 极致性能场景（最后 1-2 个百分点的提升）。其他大多数场景，LoRA + 充分训练能达到全参 95-99% 效果。

**追问**：r（LoRA rank）应该选多少？
经验值：r=8 到 64 之间。增加 r 收益递减但成本线性增加。常用配置：聊天风格调整 r=16，复杂任务 r=64。Hu et al. 2021 论文里的实验显示 r=8 时已能接近全参效果——大模型的 update 矩阵确实是低秩的。这背后是大模型的"低秩本质" hypothesis。

### Q: SFT 数据真的越少越好吗？LIMA 那篇是不是被过度解读了？

**30 秒版本**：LIMA 的发现是"高质量少量数据足以激活预训练能力"，不是"越少越好"。准确的理解是 quality > quantity，且**有边际效应**。1000 条精品好过 10 万条平均水准，但 10 万条精品好过 1000 条精品。生产实践：先用千级精品建 baseline，再逐步加量看是否还有提升，加到不提升就停。

**追问**：那为什么 OpenAI/Anthropic 似乎仍用海量 SFT 数据？
原因有二：(1) 它们要覆盖的能力面极广（编程、数学、创作、安全、多语言...），每个能力都要足够数据；(2) 高质量数据不是免费的，所谓"百万样本"经过严格筛选，等效 LIMA 标准的精品可能只有几万。表面看是海量，本质仍是 quality first。

---

## 延伸阅读

- **论文：InstructGPT** ([arxiv 2203.02155](https://arxiv.org/abs/2203.02155))
  OpenAI Ouyang et al. 2022。RLHF 的奠基论文。读它是为了理解经典 RLHF 三步范式以及人类标注的 trade-off。

- **论文：DPO** ([arxiv 2305.18290](https://arxiv.org/abs/2305.18290))
  Rafailov et al. 2023。读它是为了理解 DPO 数学推导——尤其那个"最优策略和 reward 的解析关系"，这是整篇论文的灵魂。

- **论文：LIMA** ([arxiv 2305.11206](https://arxiv.org/abs/2305.11206))
  Meta 2023。读它会颠覆你对 SFT 数据量的认知。1000 条数据 + 65B base = 接近 ChatGPT 的实验设计本身就值得学习。

- **论文：LoRA** ([arxiv 2106.09685](https://arxiv.org/abs/2106.09685))
  Hu et al. 2021。读它是为了理解"低秩适配"的数学动机——为什么大模型的微调更新确实是低秩的。

- **论文：Constitutional AI** ([arxiv 2212.08073](https://arxiv.org/abs/2212.08073))
  Anthropic 2022。读它是为了理解 RLAIF 路线和"宪法"机制——这是和 OpenAI 路线最大的分歧点。

- **博客：The State of Fine-Tuning (HuggingFace)** ([huggingface.co/blog/](https://huggingface.co/blog/))
  HuggingFace 系列博客，几乎每个新训练算法都有实操教程。读 TRL（Transformer Reinforcement Learning）库的文档 + 示例是入门最佳路径。

- **代码：trl** ([github.com/huggingface/trl](https://github.com/huggingface/trl))
  HuggingFace 的 RLHF/DPO 实现库。读 README + examples，能很快上手训自己的偏好对齐模型。
