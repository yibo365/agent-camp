---
title: ReAct 模式（Prompt 视角）
description: ReAct 作为一个 prompt 范式——Thought / Action / Observation 三段式如何让模型从"会答题"变成"会做事"。
pageClass: prompt-react-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">Prompt 工程</p>
  <h1>ReAct Prompt 模式</h1>
  <p class="doc-hero__lead">Thought / Action / Observation 三段式，让模型从"会答题"变成"会做事"——Agent 时代的奠基 prompt 范式。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：Prompt 进阶 → Agent 入门</span>
    <span>核心机制：交替推理与行动</span>
    <span>面试重点：和原生 function calling 的区别</span>
  </div>
</section>

> **注**：本文聚焦 ReAct 作为 **prompt 模式** 的设计。关于 ReAct 作为 **Agent 架构**的完整工程实现，见 [Agent - ReAct 模式](../agent/react-pattern)。

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>ReAct 三段式 Thought/Action/Observation 各自是什么？为什么要 Thought 这一步？</strong>
    <span>考你能不能讲清"为什么不直接 Action"。</span>
  </div>
  <div>
    <strong>ReAct 和"直接 function calling"的区别在哪？</strong>
    <span>考你对 OpenAI tool use 演化的理解。</span>
  </div>
  <div>
    <strong>ReAct 论文里实测的提升幅度有多大？哪些任务上效果显著？</strong>
    <span>考具体数据，能不能讲出 HotpotQA、ALFWorld 等基准。</span>
  </div>
  <div>
    <strong>ReAct 失效的典型模式是什么？怎么 debug？</strong>
    <span>考实战经验，区分纸上知识。</span>
  </div>
  <div>
    <strong>ReAct 的 Thought 如果是幻觉怎么办？怎么约束？</strong>
    <span>考工程实战，幻觉的处理。</span>
  </div>
  <div>
    <strong>2024 后原生 function calling 这么强，ReAct 还有意义吗？</strong>
    <span>考新趋势，ReAct 的演化和价值。</span>
  </div>
  <div>
    <strong>ReAct 和 CoT 是什么关系？ReAct = CoT + 工具？</strong>
    <span>考概念辨析。</span>
  </div>
</div>

---

## 为什么需要 ReAct

CoT 让模型"会想"，但不会"做事"。Function calling 让模型"会做事"，但容易"乱做"。ReAct 是这两者的合体。

考虑一个任务：

```
Q: 苹果公司的现任 CEO 出生在哪一年？
```

**纯 CoT 答**：
```
让我想想... 苹果 CEO 是 Tim Cook，他出生于...1960 年？
（瞎猜，可能错）
```

**直接 Function calling**：
```
模型直接调 search("苹果 CEO 生日") → 返回大量结果 → 模型从结果里抽答案
（如果第一次搜索不够好，模型不会重试或换关键词）
```

**ReAct**：
```
Thought: 我需要先知道苹果现任 CEO 是谁，再查他的生日
Action: search("苹果现任 CEO")
Observation: Tim Cook，自 2011 年起担任 CEO

Thought: 现在我知道是 Tim Cook，需要查他的生日
Action: search("Tim Cook 出生日期")
Observation: 1960 年 11 月 1 日

Thought: 我有答案了
Answer: 1960 年
```

ReAct 的核心：**强制模型在每个 Action 之前说出"我现在要干什么、为什么"**——相当于让模型自己 review 一次意图，避免乱做。

---

## ReAct 三段式

Yao et al. 2022 *ReAct: Synergizing Reasoning and Acting in Language Models* ([arxiv 2210.03629](https://arxiv.org/abs/2210.03629)) 提出的范式：

```
Thought:      模型用自然语言说出"现在我打算做什么、为什么"
Action:       结构化的工具调用，如 search("xxx") 或 calculator("1+1")
Observation:  工具返回结果，喂回给模型
（循环上面三步，直到模型给出 Answer）
Answer:       最终答案
```

完整 prompt 示例：

```
你是一个能调用工具的 Agent。可用工具：
- search(query): 网页搜索
- calculator(expr): 计算器

按以下格式工作：
Thought: <你的推理>
Action: <工具名>(<参数>)
Observation: <我会填工具的返回结果>
（重复，直到能回答）
Answer: <最终答案>

问题: {question}
Thought:
```

模型生成 Thought + Action 后停止 → 系统执行工具 → 把 Observation 填回 → 模型继续生成下一轮 → 直到 Answer。

---

## 为什么 Thought 这一步关键

直接给模型一堆工具让它调，常见两类错：
1. **调错工具**：明明该搜网页却调了计算器
2. **参数填错**：搜索 query 写得离题

ReAct 加 Thought 的本质：**逼模型在动手前先用自然语言说清楚意图，相当于自我 review。**

论文实测（HotpotQA 多跳问答）：
- 直接 Action（无 Thought）：准确率 ~25%
- ReAct（Thought + Action）：准确率 ~35%

错误分析显示，**有 Thought 时"调用不相关工具"的失败率从 40% 降到 18%**。Thought 不是"显示给用户看的解释"，是模型自己的"决策中间过程"。

---

## ReAct 实战代码（不依赖框架）

```python
import json
import re

# 定义工具
def search(query):
    # 真实实现接搜索 API
    return f"[搜索 '{query}' 的结果: ...]"

def calculator(expr):
    try:
        return str(eval(expr))
    except:
        return "计算错误"

TOOLS = {"search": search, "calculator": calculator}

REACT_PROMPT = """你是一个能调用工具的助手。可用工具：
- search(query): 搜索网页
- calculator(expr): 计算数学表达式

严格按以下格式回答（每步只输出一个 Thought 和一个 Action）：

Thought: <推理>
Action: <工具名>(<参数>)

我会执行工具并把结果填回 Observation。
重复上面格式直到能给出 Answer。

问题: {question}
"""

def run_react(question, llm, max_steps=10):
    history = REACT_PROMPT.format(question=question)
    for step in range(max_steps):
        # 让模型生成一个 Thought + Action，遇到 Observation 停止
        out = llm.chat(history, stop=["Observation:"], temperature=0)

        # 解析 Action
        action_match = re.search(r"Action:\s*(\w+)\((.*?)\)", out, re.DOTALL)
        answer_match = re.search(r"Answer:\s*(.+)", out)

        if answer_match:
            return answer_match.group(1).strip()

        if not action_match:
            return "模型未给出 Action 或 Answer"

        tool_name = action_match.group(1)
        tool_arg = action_match.group(2).strip().strip('"').strip("'")

        if tool_name not in TOOLS:
            obs = f"未知工具: {tool_name}"
        else:
            obs = TOOLS[tool_name](tool_arg)

        # 拼上 Observation，继续下一轮
        history += out + f"\nObservation: {obs}\n"

    return "超过最大步数"

# 用法
answer = run_react("2024 年诺贝尔物理学奖得主是谁？他获奖时多少岁？", llm)
```

40 行实现一个能跑的 ReAct Agent——这是它流行的重要原因，门槛极低。

---

## ReAct vs 原生 Function Calling

2023 年后 OpenAI/Anthropic 推出原生 function calling——模型直接输出结构化的 tool call JSON，不再需要 ReAct 的文本解析。

| 维度 | ReAct (prompt) | Function Calling (原生) |
|---|---|---|
| **输出格式** | 自然语言 Thought + 文本 Action | 结构化 JSON tool_call |
| **解析** | 正则解析容易出错 | 模型直接给 JSON，几乎无解析错误 |
| **Thought 步骤** | 显式存在 | 模型可选（取决于 prompt） |
| **多工具并行** | 不支持（一次只一个 Action） | 支持（一次返回多个 tool_calls） |
| **训练** | 通用模型即可 | 模型在 function calling 数据上做过 fine-tune |

**那 ReAct 还有用吗？还有。**

- **不支持原生 function calling 的模型**（小模型、开源未对齐版本）：只能用 ReAct
- **需要显式"思考过程"做 debugging**：ReAct 的 Thought 直接可读，function calling 的内部思考不可见
- **复杂多步任务，需要严格的 think-then-act 节奏**：ReAct 的强制结构更可靠
- **可解释性要求高**（金融、医疗）：Thought 链是审计的天然材料

**实战推荐**：
- 主流场景：用原生 function calling（稳定、高效）
- 复杂 agent / 需要可解释性 / 小模型：用 ReAct prompt 模式

很多生产 Agent 框架（LangChain、LlamaIndex）的"Agent" 实现都是 **function calling 的外壳 + ReAct 风格的提示**——把两者优势结合。

---

## ReAct 的常见陷阱

### 陷阱 1：Thought 是幻觉

模型可能写出"Thought: 我需要搜索 XXX"，但实际 Action 调的是 YYY——Thought 和 Action 不一致。

应对：
- 在 prompt 里加约束"Action 必须基于 Thought 的最后一句"
- 用 LLM-as-judge 后处理验证 Thought-Action 一致性
- 严重时换 function calling 模式（让模型直接产生结构化输出，避免文本不一致）

### 陷阱 2：死循环

模型反复调用同一个工具、传同样的参数，因为它不知道怎么换思路。

应对：
- 在 prompt 里告知"如果同样的搜索连续 2 次没有新信息，请换关键词"
- 系统层检测重复 Action，强制停止或重写
- 设 max_steps 硬上限

### 陷阱 3：参数解析失败

```
Action: search("OpenAI 的 GPT-4o" 的发布日期)   ← 引号嵌套，解析失败
```

应对：
- 用 function calling 替代纯文本（彻底避免解析问题）
- 严格的 prompt：在 prompt 里给清晰的参数格式示例
- 加 robust 的解析（不依赖严格的引号匹配）

### 陷阱 4：超长 Observation 占满 context

工具返回 5000 字的搜索结果，全填进 history，几轮后 context window 爆了。

应对：
- Observation 截断（如最多 500 字）
- 用另一个 LLM 调用先总结 Observation 再喂回
- 长上下文模型（Claude 200K、Gemini 1M+）

### 陷阱 5：模型给出 Answer 但答案错

模型可能"想到了答案"但实际没充分调用工具——比如直接根据训练知识答（可能过期或幻觉）。

应对：
- 在 prompt 里要求"必须至少调用一次工具后才能给 Answer"
- 在 Answer 中要求引用具体 Observation 编号

### 陷阱 6：用 ReAct 解决"无需工具"的任务

简单问题（"1+1=?"、"今天星期几"）也走 ReAct 流程 → 多次调用浪费成本。

应对：让模型自己判断是否需要工具：
```
Thought: 这个问题我直接能答，无需工具
Answer: 2
```

---

## ReAct 和 CoT 是什么关系

**ReAct = CoT + 工具调用** 的简化理解大致对，但有细节：

- **CoT**：单轮，纯推理，无外部交互
- **ReAct**：多轮，推理 + 工具，有外部信号

时序上 CoT 在前（2022 Jan）、ReAct 在后（2022 Oct）。ReAct 论文里明确提到：受 CoT 启发，把"推理"扩展到"推理 + 行动"。

进一步演化：
- **Reflexion**（2023）= ReAct + 失败反思
- **Plan-and-Execute**（2023）= 先 Plan 后 ReAct
- **o1 / R1**（2024-2025）= 把多步 Thought 训进模型权重

ReAct 是 Agent 时代最重要的 prompt 模式之一，**所有后续 Agent 框架的设计都受它影响**。

---

## 面试题深度解析

### Q: 为什么 ReAct 要有 Thought 这一步？直接让模型给 Action 不行吗？

**30 秒版本**：直接给 Action 时，模型经常犯两类错——调错工具或参数填错。论文实测无 Thought 时 40% 的失败是"调用不相关工具"。加 Thought 的本质是**逼模型在动手前用自然语言说清楚意图**，相当于自我 review 一次。Thought 后这类错误降到 18%。Thought 不是给用户看的解释——它是模型自己的"决策中间过程"，让模型有"二次思考"的机会。

**追问**：那原生 function calling 没有显式 Thought，怎么也 work？
现代 function calling 模型在训练时见过大量"思考-调用"模式，内化了类似 ReAct 的隐式 Thought 过程——只是不输出。但对于小模型、开源未对齐模型、或者需要可解释性的场景，**显式 Thought 仍然有价值**。所以 ReAct 在原生 function calling 时代演化成"显式 Thought + 结构化 Action"的混合体——LangChain、LlamaIndex 的 Agent 实现都是这个模式。

### Q: ReAct 失效时怎么 debug？

**30 秒版本**：四类典型失效及对策：(1) **Thought-Action 不一致**——Thought 说要搜 A 实际调了 B，加 prompt 约束或换 function calling；(2) **死循环**——同样 Action 反复调，加重复检测 + 强制 max_steps；(3) **参数解析失败**——切到 function calling 彻底解决；(4) **Observation 太长爆 context**——加截断或先总结再回传。debug 的关键工具是把每一步的 Thought / Action / Observation 完整打印出来，肉眼看就能定位卡在哪一环。

**追问**：那有没有自动化的 debug 工具？
有，主流是 **observability** 工具：LangSmith（LangChain 系列）、LlamaIndex Observability、Phoenix（Arize），都能可视化整个 ReAct trace——每步的 Thought / Action / Observation / latency / cost 都有。生产 Agent 必备这种工具，详见 [Agent 工程化 - 可观测性](../engineering/observability)。

### Q: 2024 后 function calling 这么强，ReAct 还有意义吗？

**30 秒版本**：还有，但价值发生变化。直接价值（"让模型会调工具"）已经被 function calling 替代——后者输出 JSON 无解析错误、支持并行调用、训练专门优化过。但 ReAct 的**核心思想**（推理-行动交替、显式 Thought、可观察 trace）已经渗透到所有 Agent 设计：Plan-and-Execute、Reflexion、Agentic RAG 都是它的演化。**作为 prompt 模式 ReAct 在淡化，作为思想 ReAct 在永生**。

**追问**：那现在新做一个 Agent 应该怎么选？
决策树：(1) 支持 function calling 的模型（GPT-4o、Claude、Gemini、Qwen 2.5+）→ 用原生 function calling + 系统 prompt 引导 Thought；(2) 不支持 function calling 的模型（小模型、老开源模型）→ 用 ReAct 文本 prompt；(3) 复杂多步任务 + 需要可解释 trace → 显式 ReAct 框架（如 LangGraph）。多数生产场景走 (1)，ReAct 思想以隐式方式体现在 prompt 设计里。

### Q: ReAct 和 CoT 是什么关系？

**30 秒版本**：ReAct = CoT 的扩展——把"纯推理"扩展到"推理 + 行动"。CoT 是单轮纯文本推理，无外部交互；ReAct 是多轮，每轮包含一个 Thought（CoT 风格）+ 一个 Action（工具调用）+ Observation（外部反馈）。时序上 CoT (2022 Jan) → ReAct (2022 Oct)。ReAct 论文里明确说受 CoT 启发。后续演化：Reflexion = ReAct + 失败反思；Plan-and-Execute = 先 Plan 后 ReAct。整条线都是"让模型能用更多 token / 更多步骤完成复杂任务"——也就是 inference-time compute scaling 的思想脉络。

**追问**：那推理模型（o1/R1）和 ReAct 是什么关系？
推理模型把"多步 Thought"训进了权重——它内部自动展开推理过程，不需要外部 prompt 提示。但推理模型仍然能调用工具（o1 / R1 都支持），所以可以看成"模型自带 CoT + 外部 function calling = 内化版 ReAct"。ReAct 作为概念框架活下来了，作为具体 prompt 模式逐渐被新的实现替代。

---

## 延伸阅读

- **论文：ReAct** ([arxiv 2210.03629](https://arxiv.org/abs/2210.03629))
  Yao et al. 2022。原始论文，必读。读它是为了看完整的 HotpotQA / ALFWorld 实验——"加一个 Thought 步骤"的简单改动带来的显著提升。

- **博客：Lilian Weng — Agent 系列** ([lilianweng.github.io/posts/2023-06-23-agent/](https://lilianweng.github.io/posts/2023-06-23-agent/))
  把 ReAct 放在 Agent 演化的完整脉络里讲，必读。

- **官方文档：OpenAI Function Calling** ([platform.openai.com/docs/guides/function-calling](https://platform.openai.com/docs/guides/function-calling))
  对比着读，理解从 ReAct 到原生 function calling 的工程演化。

- **官方文档：Anthropic Tool Use** ([docs.anthropic.com/en/docs/build-with-claude/tool-use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use))
  Claude 的 tool use 实现，和 OpenAI 略有差异。

- **代码：LangChain Agent Source** ([github.com/langchain-ai/langchain](https://github.com/langchain-ai/langchain))
  看 `langchain/agents/react/agent.py`——LangChain 早期的 ReAct 实现，最直白的工业级 ReAct 代码参考。

- **配套深度文档**：[Agent - ReAct 模式](../agent/react-pattern) — 本文聚焦 prompt 模式，那一篇展开 Agent 架构的完整工程实现。
