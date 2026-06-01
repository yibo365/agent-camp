---
title: 开源 vs 闭源选型
description: 不是"哪个更强"的问题，是"在你的约束下哪个 TCO 更低、风险更小"——一份决策矩阵。
pageClass: llm-open-vs-closed-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">大模型基础</p>
  <h1>开源 vs 闭源选型</h1>
  <p class="doc-hero__lead">不是哪个更强的问题，是在你的约束下哪个 TCO 更低、风险更小——一份决策矩阵。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：选型决策</span>
    <span>核心链路：成本 / 控制 / 性能 / 合规</span>
    <span>面试重点：决策框架而非站队</span>
  </div>
</section>

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>什么样的业务场景必须用开源模型？什么场景闭源更优？</strong>
    <span>考你能不能给出具体决策维度，不能只说"看情况"。</span>
  </div>
  <div>
    <strong>开源模型自部署的真实成本怎么算？只算 GPU 钱够吗？</strong>
    <span>考 TCO 思维，运维/工程/人力都要算进去。</span>
  </div>
  <div>
    <strong>"开源 = 免费"是误解吗？多大调用量自部署才划算？</strong>
    <span>考具体测算能力，能不能给出盈亏平衡点。</span>
  </div>
  <div>
    <strong>同 size 的开源和闭源模型，效果差距 2024-2025 缩小到了多少？</strong>
    <span>考你跟得上当前进度。</span>
  </div>
  <div>
    <strong>用 OpenAI API 的数据合规风险有哪些？怎么缓解？</strong>
    <span>考合规意识，特别是出海/金融/医疗场景。</span>
  </div>
  <div>
    <strong>开源模型的 license 有哪些坑？哪些真免费、哪些有商用限制？</strong>
    <span>考工程上线前必查项。</span>
  </div>
  <div>
    <strong>怎么设计架构让自己"不被模型绑死"？</strong>
    <span>考系统设计，模型抽象层。</span>
  </div>
</div>

---

## 为什么这章独立成篇

"开源 vs 闭源" 是个被讨论烂了的话题，但绝大多数讨论都在做无意义的"哪个更强"之争。真正的工程问题是：

**给定你的业务约束（数据、成本、合规、规模、团队），哪个 TCO 更低、风险可控？**

这章不站队任何一方，给你一份决策矩阵 + 真实成本测算 + 常见陷阱。读完你应该能在任何新场景下快速判断该走哪条路。

---

## 第一原则：闭源 API 和开源自部署是两种生意

| 维度 | 闭源 API | 开源自部署 |
|---|---|---|
| **核心计费单位** | per token | per GPU 小时（摊到 token） |
| **边际成本** | 调用越多越贵 | 固定算力，调用越多越便宜 |
| **初期成本** | 几乎为 0 | GPU 硬件 / 云租金 + 工程投入 |
| **可控性** | 厂商决定升级/降级/下线 | 完全自控 |
| **数据流向** | 上传到厂商 | 留在自己环境 |
| **延迟** | 受网络 + 厂商队列影响 | 取决于自家硬件 |
| **能力** | 通常顶级 | 略落后，但差距缩小 |
| **工程成本** | 几乎为 0 | 显著（推理引擎、监控、运维） |

**核心结论**：**调用量小 + 不关心数据流向 + 想要最强能力 → 闭源**；**调用量大 + 数据敏感 + 有工程团队 → 开源**。中间地带需要具体测算。

---

## 真实成本测算（关键）

很多人算开源成本只算 GPU 钱——这是严重低估。完整 TCO 包括：

### 直接成本

| 项目 | 闭源 API | 开源自部署 |
|---|---|---|
| **模型调用** | 按 token 付费 | 0（已为算力付费） |
| **GPU 硬件** | 0 | 月租 / 折旧 |
| **能耗** | 0 | 视部署位置 |
| **存储** | 0 | 模型权重几十-几百 GB |

### 隐性成本

| 项目 | 闭源 API | 开源自部署 |
|---|---|---|
| **工程开发** | 集成 SDK，1-2 天 | 推理引擎调优、监控、限流，2-4 周 |
| **运维** | 几乎 0 | 24x7 oncall，GPU 故障、OOM、模型重启 |
| **微调** | 部分支持（贵） | 完全可控（但需要 ML 工程师） |
| **模型升级** | 厂商自动 | 自己评估 + 部署新模型 |
| **故障容灾** | 厂商 SLA | 多区域部署、备用 GPU |

### 一个具体的盈亏平衡测算

假设场景：中文客服 Agent，每次请求 input 2K token + output 500 token，目标 QPS = 10。

**方案 A：用 Doubao API（豆包 Pro）**
- 单价：input ¥0.0008/1K token，output ¥0.002/1K token
- 单次成本：2 × 0.0008 + 0.5 × 0.002 = ¥0.0026
- 日成本（QPS 10 × 86400 = 86 万次）：¥2236
- 月成本：约 ¥67000

**方案 B：自部署 Qwen2.5-7B**
- 硬件：1 × A100 80GB（云租金 约 ¥30000/月）
- 工程开销：初期 1 人月 ≈ ¥30000，持续运维 0.3 人月 ≈ ¥9000/月
- 月成本：约 ¥40000-50000

**盈亏平衡**：当前测算下，自部署稍微便宜。但：
- QPS 翻倍：API 直接 ×2 = ¥134000，自部署只需多加一张卡 = ¥75000，差距拉大
- QPS 减半：API ¥34000，自部署还是 ¥40000，闭源占优
- 用更小模型（Doubao Lite / Qwen2.5-1.5B）：自部署成本进一步下降

**结论**：调用量低（< 5 QPS 平均）→ API 划算；调用量高（> 20 QPS 平均）→ 自部署划算；中间地带要具体算。

---

## 决策维度矩阵

按重要性排序：

### 维度 1：数据合规

最硬约束。问自己：
- 数据能不能出公司？（金融、医疗、政务通常不能）
- 数据能不能出国？（出海业务、跨境合规）
- 数据训练厂商模型可接受吗？（OpenAI 默认不训，但有 zero retention 选项）
- 是否需要 SOC2/ISO27001 等审计？

**硬规则**：
- 数据不能出公司 → **必须**开源自部署（私有云/本地）
- 数据不能出国 → 国内 API 或国内自部署
- 一般敏感（个人信息但非金融医疗）→ 闭源 API + 数据脱敏 + zero retention 选项

### 维度 2：调用规模

```
日调用量级       推荐路线
< 10K          闭源 API（盈亏点远没到）
10K - 1M       闭源 API（仍便宜，运维省心）
1M - 10M       具体测算（中间地带）
> 10M          自部署（边际成本接近 0）
```

### 维度 3：任务复杂度 + 模型能力要求

| 任务 | 推荐 |
|---|---|
| 简单分类、抽取、改写 | 任何中等模型都行，自部署小模型最便宜 |
| 复杂推理、长上下文、复杂 tool use | 闭源旗舰（GPT-4 / Claude Opus）或 R1/V3 |
| 编程 Agent | Claude Sonnet/Opus（生态最成熟）或 DeepSeek-V3（性价比） |
| 多模态 | GPT-4o / Gemini，开源差距大 |
| 推理任务 | o1 / o3 (闭源) 或 R1 (开源) |

### 维度 4：延迟要求

- 实时对话（< 1s TTFT）→ 国内 API 或自部署边缘节点
- 异步任务（分钟级）→ 任意
- 跨境 API 延迟 +200-500ms，对实时场景是硬伤

### 维度 5：团队能力

- 没有 ML/Infra 工程师 → 闭源 API（开源运维你扛不住）
- 有 1-2 个 ML 工程师 → 开源可考虑，但要选成熟的模型 + 推理引擎
- 有专门的 LLM Infra 团队 → 开源真正发挥威力

### 维度 6：模型迭代速度依赖

- 业务能力强依赖模型上限（核心 AI 产品）→ 闭源（厂商持续升级）
- 业务能力对模型上限不敏感（辅助工具）→ 开源（稳定）

---

## 主流模型按"路线 + 形态"分类

闭源 API 主流：
- **OpenAI**：GPT-4o / GPT-4.1 / GPT-5 / o3 系列
- **Anthropic**：Claude Opus / Sonnet / Haiku 系列
- **Google**：Gemini 2.x Pro / Flash 系列
- **国内**：豆包 Doubao / 文心 Ernie / 通义千问商业版 / 智谱 GLM / Kimi

开源权重主流（可自部署）：
- **Meta**：Llama 系列（社区生态最大）
- **阿里**：Qwen 系列（中文最优，尺寸完备）
- **DeepSeek**：V3、R1（性价比 + 推理）
- **Mistral**：Mixtral / Codestral 系列（欧洲 license 友好）
- **Google**：Gemma 系列（轻量级开源）

混合形态：
- **Anthropic 通过 AWS Bedrock**：Claude API 但在你 AWS 账号里跑，数据合规更好
- **Azure OpenAI**：GPT 模型 + Azure 企业合规
- **NVIDIA NIM**：闭源 + 开源模型的容器化部署服务

---

## 常见陷阱

### 陷阱 1：以为开源 = 免费

开源**模型权重**免费，但所有运行成本都是真金白银。一个错误估算的部署可能比 API 贵 3 倍。**永远算 TCO**。

### 陷阱 2：迷信"自部署 = 数据安全"

自部署只是降低了"数据被厂商训练"的风险，但增加了：
- 自家运维人员能看到 prompt 和数据
- 模型权重可能泄漏（被员工带走或被入侵）
- 推理 log 默认本地存储，可能合规风险

**真正的数据安全 = 全链路加密 + 最小权限 + 审计日志 + 定期合规检查**——不光是部署形态决定的。

### 陷阱 3：选模型不看 license

Llama license 有"7 亿月活用户限制"——一般公司用不到，但有些场景（消费级 App、SDK 嵌入）可能触发。**生产上线前必须法务过 license**。

各家 license 简表：
- **Apache 2.0 / MIT**（最友好）：Qwen、Mistral 部分、DeepSeek、Gemma 2 部分
- **Llama Community License**：商用 OK，但 7 亿 MAU 上限
- **限制商用**：某些早期开源模型（如最初的 Stable Diffusion）

### 陷阱 4：低估了 API 厂商的"突然变更"风险

OpenAI 历史上多次：调价、deprecate 老模型、限制特定地区访问、突然关闭 fine-tune endpoint。**生产系统不要硬绑死单一 API**——至少有 fallback 设计。

### 陷阱 5：选最强但用不上的模型

很多业务用 GPT-4-Turbo 跑简单分类，每次几分钱——其实 GPT-3.5 或 Qwen-7B 完全够用，成本降 10 倍。**永远问"够用就行的最弱模型是什么"**。

### 陷阱 6：以为开源能力一直追不上闭源

2023 年开源比闭源落后 1-2 代。2024 年 DeepSeek-V3 / Llama 3 / Qwen 2.5 全面对齐 GPT-4 同尺寸水平，差距缩小到 0.5 代。2025 年 R1 / Qwen3 直接对标 o1 系列。**开源 vs 闭源的能力差距正在快速收窄**——做选型时不能用 2023 年的印象。

---

## 架构建议：不被模型绑死

不论选闭源还是开源，**都应该让模型成为可替换的组件**，而不是硬编码。

```python
# 反例：硬绑死 OpenAI
from openai import OpenAI
client = OpenAI()
response = client.chat.completions.create(
    model="gpt-4o", messages=[...]
)

# 正例：抽象层
class LLMProvider(ABC):
    @abstractmethod
    def chat(self, messages, **kwargs) -> str: ...

class OpenAIProvider(LLMProvider): ...
class AnthropicProvider(LLMProvider): ...
class VLLMProvider(LLMProvider): ...   # 自部署

def get_llm(model_name: str) -> LLMProvider:
    # 路由逻辑
    ...

# 业务代码只依赖抽象
llm = get_llm("primary")
response = llm.chat(messages)
```

或者直接用现成的：
- **LiteLLM**：100+ 模型的统一 API（OpenAI 格式）
- **OpenRouter**：路由层 + 计费聚合
- **LangChain ChatModel 抽象**

好处：换模型只改配置不改代码、能做 A/B test、能做 fallback。

---

## 决策树（速查）

```
1. 数据能出公司吗？
   ├─ 不能 → 自部署开源模型，到第 5 步选具体模型
   └─ 能 → 进入 2

2. 月调用量预计多大？
   ├─ < 100 万次 → 闭源 API（运维成本不划算）
   └─ > 1000 万次 → 进入 3（考虑自部署）
   └─ 中间 → 进入 4（具体测算）

3. 有 ML/Infra 工程师吗？
   ├─ 没有 → 仍用闭源 API（外包运维风险大）
   └─ 有 → 进入 5（开源候选）

4. 任务复杂度 + 延迟敏感度？
   ├─ 简单任务 + 实时 → 国内 API（豆包/通义/Doubao Lite）
   ├─ 复杂任务 + 不实时 → 闭源旗舰
   └─ 复杂任务 + 实时 → 闭源 + 缓存层

5. 选具体开源模型：
   ├─ 中文为主 → Qwen / DeepSeek
   ├─ 英文为主 → Llama / Mistral
   ├─ 推理任务 → DeepSeek-R1
   └─ 极致性价比 → DeepSeek-V3
```

---

## 面试题深度解析

### Q: 多大调用量自部署才划算？怎么算盈亏平衡？

**30 秒版本**：粗略经验：日均稳定 QPS > 10 + 有运维团队，自部署开始划算；QPS > 50 自部署明显占优；QPS < 5 几乎一定选 API。精确计算要看：(1) API 单价（input/output 分开）；(2) 自部署 GPU 月成本；(3) 隐性的工程/运维投入。常见的算法是：用 API 月成本 ≥ (GPU 月成本 + 工程摊销) 时切自部署。

**追问**：那混合架构呢？高峰用 API 兜底、低峰用自部署？
是常见架构。叫 "spillover routing"——自部署 GPU 处理日常 90% 流量，超出能力的高峰打到 API。这种架构让你能用更少 GPU + 容忍流量 spike。代价是要做请求路由和限流，工程复杂度上升。京东、Notion 等都用类似架构。

### Q: 用 OpenAI API 的合规风险有哪些？怎么缓解？

**30 秒版本**：四个层面：(1) **数据训练风险**——API 默认不会训练（OpenAI 政策），但需要在合同里明确；(2) **数据驻留**——数据可能流经美国/欧洲数据中心，跨境合规问题；(3) **日志保留**——OpenAI 默认保留 30 天用于安全审查，可申请 zero retention（企业版）；(4) **法律管辖权**——数据可能受美国司法管辖（Cloud Act）。缓解方法：用 Azure OpenAI（数据驻留在 Azure region）、用 AWS Bedrock 的 Anthropic Claude（数据驻留在 AWS）、敏感字段脱敏后再调 API、合同里加 BAA（医疗场景）。

**追问 1**：那国内 API 是不是就没有这些问题？
国内 API 解决跨境问题，但有自己的合规要求：等保、数据安全法、生成式 AI 服务管理办法。需要厂商有相应的备案/许可。**不存在"零合规风险"的方案**，只是合规的方向不同。

**追问 2**：那有没有"既用 GPT，又完全合规"的方案？
有几种：(1) **Azure OpenAI Service**——微软合作的 GPT，数据驻留在你指定的 Azure region，企业合规完整；(2) **OpenAI Enterprise**——企业版有 SOC 2、HIPAA BAA、zero retention、SSO；(3) **自部署 + 用 GPT API 仅做特定任务**——核心数据自部署处理，仅低敏感任务走 API。

### Q: 怎么设计架构让自己"不被模型绑死"？

**30 秒版本**：核心是**模型抽象层**——业务代码只依赖统一接口，具体调用哪家模型由配置决定。要素：(1) 统一接口（chat / embedding / function calling）；(2) 配置驱动（YAML/DB 决定哪个业务用哪个模型）；(3) 路由策略（按任务类型、租户、降级策略选模型）；(4) Fallback（主模型失败时自动切备用）；(5) 监控（每个模型的成功率、延迟、成本）。可以自己实现，也可以用 LiteLLM、OpenRouter 这些现成方案。

**追问**：抽象层不可避免有"最大公约数"问题——某个模型独有的能力（如 Claude 的 prompt cache、OpenAI 的 structured output）怎么办？
两种处理：(1) **扩展接口**——独有能力作为可选参数加入抽象接口，不支持的模型 fallback 到默认实现；(2) **能力分级**——把模型按能力分组（如 "supports_structured_output"），路由时检查能力匹配。完美抽象不存在，工程上选 80% 通用 + 20% 模型特定优化是个好平衡。

### Q: 同 size 开源和闭源的差距 2024-2025 缩小到什么程度？

**30 秒版本**：同 size 维度（如 70B 对比 70B），开源已经基本追平闭源——Llama 3 70B、Qwen 2.5-72B 在多个 benchmark 上接近或超过 GPT-4 同期水平。但**跨 size 比较**仍有差距——闭源最强模型（GPT-4o、Claude Opus、Gemini 2 Pro）可能用了几百 B 甚至 trillion 参数，开源最大的 DeepSeek-V3（671B MoE）能对标但场景特定。**结论**：开源在"主流尺寸"已经够用，闭源在"绝对天花板"仍领先。

**追问**：开源在哪些维度仍明显落后？
三个领域：(1) **多模态**——GPT-4o 原生视觉 / 音频 / 文本，开源还在追赶；(2) **function calling 稳定性**——OpenAI 工程化最成熟，开源在复杂工具调用场景错误率仍偏高；(3) **超长上下文**——Gemini 2M、Claude 200K 实际质量好，开源 100K+ 上下文质量下降明显。这些差距是 2025 年开源社区的重点攻关方向。

---

## 延伸阅读

- **博客：OpenAI Enterprise Privacy** ([openai.com/enterprise-privacy](https://openai.com/enterprise-privacy/))
  OpenAI 官方说明企业版的数据政策。读它是为了搞清楚"API 数据到底会被怎么用"。

- **博客：Anthropic Usage Policy** ([anthropic.com/legal/usage-policy](https://www.anthropic.com/legal/usage-policy))
  Anthropic 的使用政策。读它是为了对比和 OpenAI 的差异——Anthropic 在数据训练承诺上更明确。

- **工具：LiteLLM** ([github.com/BerriAI/litellm](https://github.com/BerriAI/litellm))
  统一 100+ LLM 的接口层。看它的代码是学习"如何抽象多家 LLM API"的最佳教材。

- **工具：OpenRouter** ([openrouter.ai](https://openrouter.ai/))
  LLM 聚合平台，单个 API key 调任何模型。适合做模型横向测试、不想分别注册多家账号时。

- **报告：Hugging Face Open LLM Leaderboard** ([huggingface.co/spaces/open-llm-leaderboard](https://huggingface.co/spaces/open-llm-leaderboard))
  开源模型综合评测榜。跟踪开源 vs 闭源的实时差距。

- **博客：The Bitter Lesson** ([incompleteideas.net/IncIdeas/BitterLesson.html](http://www.incompleteideas.net/IncIdeas/BitterLesson.html))
  Rich Sutton 2019 经典文。读它会让你跳出"开源 vs 闭源"的短期视角，从 70 年 AI 历史看长期趋势——通用方法 + 大规模算力终究会赢。这影响你对模型选型的长期思考方式。
