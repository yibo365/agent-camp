---
title: 推理优化
description: KV Cache、量化、FlashAttention、Speculative Decoding、PagedAttention——把 LLM 推理成本砍 10 倍的所有手段。
pageClass: llm-inference-optimization-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">大模型基础</p>
  <h1>推理优化</h1>
  <p class="doc-hero__lead">同样的模型，同样的 prompt，工程优化后的推理可以快 10 倍、便宜 10 倍——这些技术是 LLM 商业化的核心壁垒。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：进阶 + 工程化</span>
    <span>核心链路：KV Cache / 量化 / FlashAttention / Speculative</span>
    <span>面试重点：瓶颈分析 + 优化栈</span>
  </div>
</section>

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>LLM 推理的瓶颈到底是计算还是显存？为什么？</strong>
    <span>考最基础的认知，能不能讲清 memory-bound vs compute-bound。</span>
  </div>
  <div>
    <strong>Prefill 和 Decode 两个阶段的 trade-off 各是什么？</strong>
    <span>考你能不能分清"读 prompt"和"生成 token"是两种完全不同的负载。</span>
  </div>
  <div>
    <strong>KV Cache 显存怎么算？为什么长上下文会爆显存？</strong>
    <span>考具体公式和直觉。</span>
  </div>
  <div>
    <strong>FlashAttention 为什么比标准 attention 快？算法层面做了什么？</strong>
    <span>考前沿了解，IO-aware 算法的核心思想。</span>
  </div>
  <div>
    <strong>4-bit 量化为什么效果几乎不掉？INT4 和 NF4 区别？</strong>
    <span>考量化的工程细节。</span>
  </div>
  <div>
    <strong>Speculative Decoding 是什么？小模型和大模型怎么配合？</strong>
    <span>考新兴技术，2024 后生产标配。</span>
  </div>
  <div>
    <strong>vLLM 的 PagedAttention 解决什么问题？为什么传统 KV Cache 浪费严重？</strong>
    <span>考主流推理引擎背后的核心 idea。</span>
  </div>
  <div>
    <strong>continuous batching 和 static batching 区别？为什么前者吞吐高这么多？</strong>
    <span>考批处理调度，工程实战必懂。</span>
  </div>
</div>

---

## 为什么需要推理优化

一个未优化的 70B 模型在 A100 上推理：
- 单条请求：每 token 50-100 ms，1000 token 输出需要 50-100 秒
- 并发：吃显存，一张卡只能跑几个并发
- 成本：每千 token 几分钱起

同样模型用 vLLM + 各种优化后：
- 单条延迟：每 token 10-20 ms，提速 5 倍
- 并发：几十到上百
- 成本：几厘到几分

这中间的差距不是模型变了，是**工程优化栈的差距**。理解这些优化是 LLM 工程岗位的核心能力。

---

## 第一原理：瓶颈到底在哪？

**LLM 推理的瓶颈不是计算，是显存带宽。**

这个反直觉的结论需要展开。考虑生成阶段（decode），每生成一个 token 要做：
1. 读全部模型权重（如 70B fp16 = 140 GB）从 HBM → SRAM
2. 算一次 forward
3. 算 KV Cache 更新

GPU 的算力（TFLOPS）和显存带宽（GB/s）增长速度严重不平衡：
- A100 算力 312 TFLOPS、显存带宽 2 TB/s → 算力/带宽 = 156 FLOPS per byte
- 7B 模型 decode 时实际计算 / 数据搬运 ≈ 2 FLOPS per byte

**实际计算强度比 GPU 理论平衡点低 78 倍**——意味着 GPU 大部分时间在等数据从 HBM 搬到 SRAM，计算单元闲着。这种情况叫 **memory-bound**。

所以推理优化的核心就是两件事：
1. **减少要搬的数据**：量化、蒸馏
2. **复用已搬的数据**：batching、prefill 复用

---

## Prefill vs Decode：两个完全不同的阶段

LLM 推理分两个阶段，性能特征完全不同：

| 阶段 | 输入 | 输出 | 计算密度 | 瓶颈 |
|---|---|---|---|---|
| **Prefill** | 整个 prompt（如 1000 token） | 第 1 个 token + 所有 KV Cache | 高（compute-bound） | 算力 |
| **Decode** | 上一个 token | 下一个 token + 1 个 KV Cache 增量 | 低（memory-bound） | 显存带宽 |

**Prefill**：一次性处理整段 prompt，可以并行计算所有位置的 K/V——这是矩阵乘矩阵，计算量大，能充分利用 GPU 算力。延迟 = 序列长度的几乎线性函数。

**Decode**：自回归生成，每次只算一个新 token——这是矩阵乘向量，算力利用率低，瓶颈在搬权重。延迟 = 每 token 固定时间 × token 数。

**关键 insight**：这两个阶段的优化方向完全不同。
- Prefill 优化：FlashAttention（IO-aware）、prefill chunking
- Decode 优化：KV Cache、量化、speculative decoding、continuous batching

理解这个二分法，是后面所有优化技术的前提。

---

## 优化技术全景

### 1. KV Cache：避免重复计算

详见 [Transformer 架构](./transformer) 的 KV Cache 章节。本质：**decode 时第 t 步的 attention 需要前 t-1 步的 K 和 V，而这些值已经算过且不会变——缓存它们**。

不用 KV Cache，生成 1000 token 要做 1000² 次 attention 计算。用了以后是 1000 次 attention 计算 + 1000 次 KV Cache 查找。

**代价**：显存占用。公式：
```
KV Cache 大小 = 2 (K+V) × num_layers × num_heads × head_dim × seq_len × batch_size × dtype_bytes
```

Llama-7B fp16 (32 层 × 32 头 × 128 dim)：每 token 占 512 KB。
- 1000 token：512 MB
- 100K token：50 GB（超过 A100 显存！）

长上下文场景，KV Cache 比模型权重还大——这就是后续 KV Cache 量化、MQA/GQA 的存在意义。

### 2. MQA / GQA：减少 KV Cache 的头数

标准 Multi-Head Attention：每个 head 有独立的 K 和 V。
- 32 头 → KV Cache 大小 × 32

**Multi-Query Attention (MQA)**：所有 head 共享一份 K 和 V（只有 Q 是多头的）。
- KV Cache 大小 ÷ 32，省 32 倍显存
- 代价：表征能力略降

**Grouped-Query Attention (GQA)**：折中——把 head 分成 G 组，组内共享 K/V。Llama 2/3、Qwen 2/3、Mistral 都用 GQA（典型 G=8）。
- KV Cache 大小 ÷ 4 到 ÷ 8
- 表征能力几乎不掉

GQA 是 2023 年后所有大模型的标配。

### 3. 量化：用更少 bit 存权重

模型权重默认 fp16（每个数 2 字节）。量化把它压成更少 bit：

| 量化 | bits | 模型大小 | 效果损失 | 推理速度 |
|---|---|---|---|---|
| **fp16** (baseline) | 16 | 1× | 0 | 1× |
| **int8** (W8A16) | 8 | 0.5× | 几乎无 | 1.5-2× |
| **int4** (W4A16) | 4 | 0.25× | 1-3% 任务掉点 | 2-3× |
| **int4 NF4** | 4 | 0.25× | <1% 掉点 | 同 int4 |

**两个主流算法**：

**GPTQ** (Frantar et al. 2022)：基于二阶信息的逐层量化，需要少量校准数据，效果好但量化慢。

**AWQ** (Lin et al. 2023)：发现权重重要性不均匀，**保留前 1% 重要权重的精度，对其余激进量化**。效果接近 GPTQ 但快 3 倍。

**为什么 4-bit 效果几乎不掉？**

LLM 权重有强冗余——每个权重的贡献分布不均，多数权重对最终输出影响很小。量化主要损失的是这些"无关紧要"的权重的精度。

**NF4 (NormalFloat 4-bit)** 是 QLoRA 提出的量化格式：基于权重通常服从正态分布的事实，把 16 个量化层级**非均匀**地按正态分布分位数排布，比均匀 int4 更精准。

### 4. FlashAttention：把 attention 算得更快

详见 [Transformer 架构](./transformer) 提到的核心 idea。这里展开。

**标准 attention 的真正瓶颈**：

```
# 标准实现
S = Q @ K.T       # 写入 HBM
P = softmax(S)    # 从 HBM 读，写入 HBM
O = P @ V         # 从 HBM 读，最终输出
```

每一步都要在 HBM 上读写完整的 (seq_len, seq_len) 矩阵——对于 seq_len=8192，这是 8192×8192×2 字节 = 128 MB 的反复 IO。GPU 的算力完全跑不满，时间全在搬数据。

**FlashAttention 的核心 idea**：把 Q/K/V 切成 tile，在 SRAM 里增量计算 softmax 和 attention 输出，**永远不把完整的 (seq, seq) 矩阵写入 HBM**。

代价：要在线维护一个增量 softmax（online softmax）——数学不平凡，但被 Tri Dao 推导出来了 (Dao et al. 2022)。

效果：长序列时快 2-4 倍，显存占用从 O(n²) 降到 O(n)。

FlashAttention-2、FlashAttention-3 进一步优化（更好的并行划分、利用 H100 的 TMA 指令）。今天所有主流推理引擎都默认开启 FlashAttention。

### 5. Speculative Decoding：用小模型加速大模型

核心 idea：**让一个小模型"先猜"几个 token，大模型一次性 verify**。

```
1. Draft model（小模型，如 1B）生成 K=4 个候选 token：[A, B, C, D]
2. Target model（大模型，如 70B）一次 forward 验证这 4 个 + 1 个新位置：
   - 如果大模型在这些位置上的概率分布"接受" draft 的选择，全部 commit
   - 在某个位置拒绝，回到该位置，用大模型的输出继续
3. 期望情况：每次大模型 forward 推进 2-3 个 token
```

**为什么有效？**
- decode 是 memory-bound 的——一次 forward 算 1 个 token 和算 4 个 token 几乎一样慢（瓶颈是搬权重）
- 小模型在大多数"简单"位置预测和大模型一致（如填介词、续写常见短语）
- 平均加速 2-3 倍，效果零损失（数学上严格等价于直接用大模型）

**主流变种**：
- **Medusa**：不用独立 draft 模型，让大模型自己输出多个未来 token 的预测
- **EAGLE / Lookahead Decoding**：进一步优化 draft 质量
- **Self-Speculative Decoding**：用大模型的浅层做 draft，深层做 verify

vLLM、TensorRT-LLM 都内置 speculative decoding 支持。

### 6. PagedAttention：解决 KV Cache 碎片化

**问题**：传统 KV Cache 是连续分配的——每个请求开始时预分配 max_length × 每 token 大小的显存。但实际生成长度往往远小于 max_length，**浪费 60-80% 显存**。

**vLLM 的 PagedAttention 解法**（Kwon et al. 2023 [arxiv 2309.06180](https://arxiv.org/abs/2309.06180)）：仿照操作系统的虚拟内存——把 KV Cache 切成固定大小的 page（如 16 token 一页），按需分配。

效果：
- 显存利用率从 20-40% 提到 90%+
- 同等显存能跑 2-4 倍并发
- 支持 prefix sharing（多个请求共享相同前缀的 KV Cache）

PagedAttention 是 vLLM 之所以成为开源推理引擎事实标准的核心创新。

### 7. Continuous Batching：动态拼请求

**Static batching**（朴素做法）：固定 batch_size，所有请求一起推理，全部完成才返回。
- 问题：长请求拖慢短请求，GPU 利用率低

**Continuous batching**（vLLM 等用的方法）：每个 decode step 重新决定 batch 组成——哪个请求生成完了就让出位置，新请求随时插入。
- 长请求不阻塞短请求
- 吞吐量提升 5-10 倍

实现复杂（要管理动态的 KV Cache），但效果显著。

---

## 实战：用 vLLM 部署一个高吞吐 LLM 服务

```python
# pip install vllm

from vllm import LLM, SamplingParams

# 1. 加载模型（自动开启 PagedAttention + continuous batching + FlashAttention）
llm = LLM(
    model="Qwen/Qwen2.5-7B-Instruct",
    dtype="float16",
    gpu_memory_utilization=0.9,   # 用 90% 显存
    max_model_len=8192,
    enable_prefix_caching=True,    # 缓存共同前缀（system prompt 等）
    # quantization="awq",          # 如果模型是 AWQ 量化版本
    # speculative_model="Qwen/Qwen2.5-0.5B-Instruct",  # 投机解码
    # num_speculative_tokens=5,
)

# 2. 准备一批请求
prompts = [
    "解释一下量子纠缠",
    "写一段冒泡排序",
    "翻译: I love coding into Chinese",
    # ... 几十上百条
]
sampling_params = SamplingParams(temperature=0.7, top_p=0.9, max_tokens=512)

# 3. 一次性推理（vLLM 内部自动 continuous batching）
outputs = llm.generate(prompts, sampling_params)

for o in outputs:
    print(o.outputs[0].text)
```

启动后看监控：单张 A100 上 Qwen-7B 通常能跑到 1500-3000 tokens/秒的总吞吐——比朴素 HuggingFace `model.generate()` 快 10 倍以上。

或者用 vLLM 自带的 OpenAI 兼容 API 服务器：

```bash
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct \
  --enable-prefix-caching \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.9
# 然后用 OpenAI Python SDK 直接调，零代码切换
```

---

## 常见陷阱

### 陷阱 1：盲目堆 batch_size 想要高吞吐

batch_size 增大时，KV Cache 显存线性增加。设 batch=32 但实际只有 16 个请求时，剩下 16 份显存白占。**Continuous batching 才是正解**——vLLM、TGI、SGLang 都默认开。手动设固定 batch 是 2022 年的玩法了。

### 陷阱 2：以为量化"免费午餐"

4-bit 量化通常在生成型任务上几乎不掉点，但在**长上下文检索、数学推理、代码生成**这些精度敏感任务上可能掉 5-10 个百分点。生产部署前必须用业务评估集实测，不能只看 MMLU 之类的通用 benchmark。

### 陷阱 3：忽视 prefill 延迟

很多 LLM 服务报"每 token 20 ms"——但这只是 decode。如果用户输入是 10K token，prefill 可能要 5-10 秒（取决于硬件）。**用户感受到的延迟 = prefill 时间 + 第 1 token 延迟（TTFT）**。优化 TTFT 需要：
- 启用 prefill chunking（分块 prefill 避免阻塞 decode）
- 用 prefix caching 复用 system prompt 的 KV
- 必要时升级到 H100/H200（算力强 prefill 快）

### 陷阱 4：speculative decoding 在创意场景效果差

speculative decoding 在"模型大多数 token 预测一致"时收益大——所以适合代码、事实问答、结构化输出。但在**高温采样的创意写作**场景，draft 模型和 target 模型的输出经常不一致，接受率低，反而慢。temperature > 0.7 时建议关闭。

### 陷阱 5：用 fp16 而不是 bf16

bf16（Brain Float 16）和 fp16 都是 16 位，但 bf16 牺牲精度换更大动态范围。fp16 在数值溢出/下溢边缘的场景（特别是训练）经常出 NaN。**新硬件（A100+）都支持 bf16，默认用 bf16 比 fp16 更稳定**，性能一样。

### 陷阱 6：以为推理引擎"开箱即用"

vLLM、TGI 等引擎参数复杂——`max_num_seqs`、`block_size`、`swap_space`、`enable_chunked_prefill`、`max_num_batched_tokens` 每个都可能影响吞吐 2-3 倍。生产部署前**必须做压测**，针对自己的 prompt 长度分布、并发模式调参，不能直接用默认值。

---

## 优化栈全景（一张表看完）

| 优化层 | 技术 | 提升 | 代价 |
|---|---|---|---|
| **架构** | GQA / MQA | KV Cache ÷4-8 | 训练时改 |
| **算子** | FlashAttention 2/3 | 长序列快 2-4× | 已是默认 |
| **权重** | INT8/INT4 量化 (GPTQ/AWQ) | 显存 ÷2-4，速度 1.5-3× | 1-3% 精度损失 |
| **KV Cache** | KV 量化 (INT8/FP8) | KV 显存 ÷2 | 几乎无损 |
| **KV Cache** | PagedAttention | 显存利用率 +50% | 引擎层实现 |
| **解码** | Continuous Batching | 吞吐 5-10× | 引擎层实现 |
| **解码** | Speculative Decoding | 单请求快 2-3× | 需要小 draft 模型 |
| **解码** | Prefix Caching | 共享前缀场景快 2-5× | 内存开销 |
| **服务** | Tensor Parallelism | 单模型跨多卡 | 通信开销 |
| **服务** | Pipeline Parallelism | 超大模型部署 | 流水线气泡 |

生产部署一个 LLM 服务，多数情况下用 vLLM/TGI/SGLang 之一 + 4-bit AWQ 量化 + 启用所有默认优化，就能达到主流水平。再往上要根据业务做 profiling 决定。

---

## 面试题深度解析

### Q: LLM 推理瓶颈是计算还是显存？为什么？

**30 秒版本**：**Decode 阶段是显存带宽 bound，不是算力 bound**。生成一个新 token 需要把全部模型权重（如 7B fp16 = 14 GB）从 HBM 搬到 SRAM 才能算一次 forward。GPU 算力 / 显存带宽 的理论平衡点是 156 FLOPS/byte，但 decode 的实际计算密度只有 2 FLOPS/byte——意味着 GPU 大部分时间在等数据搬运，算力闲置。Prefill 阶段例外，那时是大矩阵乘，确实算力 bound。

**追问**：那为什么不直接用算力更强的卡？换 H100 不就行了？
H100 算力是 A100 的 3 倍，但显存带宽只提升 1.6 倍。换 H100 对 decode 阶段的提升远没有"3 倍"那么夸张——因为瓶颈不在算力。真正能拉开差距的是 H200/B100/B200 这些显存带宽显著提升的卡（HBM3e、HBM4）。所以行业选卡的趋势是"看 memory bandwidth 多过 FLOPS"。

### Q: FlashAttention 比标准 attention 快在哪？算法关键是什么？

**30 秒版本**：标准 attention 的瓶颈不是计算量（FLOPS 没省），而是**HBM 读写量**——它要把完整的 (seq, seq) 注意力矩阵反复读写 HBM。FlashAttention 用 tiling + online softmax 把 Q/K/V 切成小块在 SRAM 里增量计算，**永远不把完整 attention 矩阵写入 HBM**。HBM 读写量从 O(n²) 降到 O(n)，长序列上快 2-4 倍。

**追问 1**：online softmax 数学上怎么做？softmax 不是要看到全部值才能算分母吗？
关键技巧：保持运行最大值 `m` 和运行分母 `l`，每来一个新块就更新这两个量并 rescale 之前累积的输出。具体来说，新块来时计算新的最大值 `m_new = max(m, max(new_block))`，然后用 `exp(m - m_new)` 调整旧的累积。最终结果数学上等价于一次性算完整 softmax，但只用 O(1) 额外显存。

**追问 2**：FlashAttention 训练能用吗？
能。FlashAttention 同时支持 forward 和 backward（backward 需要重算 attention 矩阵——通过 checkpointing 思想避免存储）。今天所有主流训练框架（PyTorch 的 sdpa、HuggingFace、DeepSpeed）默认都用 FlashAttention。

### Q: vLLM 比 HuggingFace transformers 快 10 倍的关键技术？

**30 秒版本**：三个核心：(1) **PagedAttention**——把 KV Cache 切页按需分配，显存利用率从 20-40% 提到 90%+；(2) **Continuous Batching**——每个 decode step 动态重组 batch，不让长请求阻塞短请求，吞吐 5-10 倍；(3) **优化的 CUDA kernel**（FlashAttention 等）。三者叠加才有 10 倍效果，缺一个都达不到。

**追问**：那 SGLang、TGI 跟 vLLM 比怎么样？
SGLang 在结构化输出（JSON、tool calling）场景比 vLLM 快——它做了 RadixAttention（更激进的 prefix sharing）+ 编译式 LLM 程序优化。TGI 是 HuggingFace 自家的，工程稳定性好但优化没 vLLM/SGLang 激进。2024 年后开源推理引擎进入"三国杀"，各自有适合的场景：
- vLLM：通用首选，社区最大
- SGLang：复杂结构化输出、agent 场景
- TGI：HuggingFace 生态集成度好

### Q: Speculative Decoding 为什么不会损失精度？

**30 秒版本**：因为大模型最终对 draft 模型的每个 token 做严格的**概率分布对比**——只有在大模型概率高于（或满足某个 rejection sampling 条件）draft 概率时才接受。数学上可以证明，rejection sampling 之后得到的 token 分布**严格等于直接用大模型采样的分布**。所以是"零精度损失的加速"。

**追问**：那加速能到多少？瓶颈在哪？
加速比 = 平均每次 verify 接受的 token 数 + 1。理想情况能到 3-4 倍，实际 2-3 倍很常见。瓶颈：(1) draft 模型要够强——猜得越准接受率越高；(2) 高温采样时接受率显著下降（greedy 接受率最高）；(3) 大模型 verify 的 overhead 也不为零，K 太大反而拖慢（最优 K 通常 4-6）。

---

## 延伸阅读

- **论文：FlashAttention** ([arxiv 2205.14135](https://arxiv.org/abs/2205.14135))
  Dao et al. 2022。读它是为了理解 "IO-aware 算法" 的范式——这是 GPU 优化领域的范式转变。FlashAttention-2 ([arxiv 2307.08691](https://arxiv.org/abs/2307.08691))、FlashAttention-3 ([arxiv 2407.08608](https://arxiv.org/abs/2407.08608)) 是后续迭代。

- **论文：vLLM / PagedAttention** ([arxiv 2309.06180](https://arxiv.org/abs/2309.06180))
  Kwon et al. 2023。读它是为了理解"OS 虚拟内存思想应用于 KV Cache"——一个工程 idea 怎么定义了开源推理引擎的事实标准。

- **论文：Speculative Decoding** ([arxiv 2211.17192](https://arxiv.org/abs/2211.17192))
  Leviathan et al. 2022 (Google)。读它是为了看那个"零损失加速"的 rejection sampling 数学推导——简洁优雅，读完拍大腿。

- **论文：AWQ (Activation-aware Weight Quantization)** ([arxiv 2306.00978](https://arxiv.org/abs/2306.00978))
  Lin et al. 2023。读它是为了理解为什么"保留 1% 重要权重 + 量化剩下 99%"能几乎无损——LLM 权重重要性的不均匀分布。

- **代码：vLLM** ([github.com/vllm-project/vllm](https://github.com/vllm-project/vllm))
  当前最主流的开源 LLM 推理引擎。读 README + 试运行一个模型，能快速建立工程直觉。

- **代码：TensorRT-LLM** ([github.com/NVIDIA/TensorRT-LLM](https://github.com/NVIDIA/TensorRT-LLM))
  NVIDIA 自家推理引擎，性能上限通常比 vLLM 高 10-30%，但易用性差。生产里 NVIDIA 卡上做极致优化时用。

- **博客：Making Deep Learning Go Brrrr From First Principles** ([horace.io/brrr_intro.html](https://horace.io/brrr_intro.html))
  Horace He 的经典博客，从第一性原理讲清 GPU 性能分析（memory-bound vs compute-bound）。读完会让你看推理优化论文豁然开朗。
