---
title: GPT Engineer 源码剖析
description: GPT Engineer 是 2023 年现象级开源项目（55k+ star），它用一个极简的"一句话生成整个项目"流程定义了早期 AI 编程的想象力。本文从 simple_agent.py 的 init/improve 双方法出发，拆解 gen_code → gen_entrypoint → execute 的 step pipeline、FILENAME+代码块的文件解析协议、preprompt 驱动的设计哲学，以及它和 ReAct 式 Agent 的本质区别。
pageClass: source-gpt-engineer-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">Agent 源码解析</p>
  <h1>GPT Engineer 源码剖析</h1>
  <p class="doc-hero__lead">GPT Engineer 是 Anton Osika 2023 年 6 月开源的项目，一度是 GitHub 增长最快的仓库之一（55k+ star）。它的卖点很直接：你用自然语言描述一个软件，它一次性生成整个项目的所有代码文件。在 ReAct、tool calling 还没成为编程 Agent 标配的 2023 年，GPT Engineer 用一套极简的"prompt 流水线"探索了"AI 写整个项目"的可能性。它本身不是严格意义上的 Agent（没有工具循环、没有自主探索），但读它的源码能看清一个重要的设计分野：<strong>"一次性生成" vs "迭代式 Agent"</strong>——理解这个区别，才理解后来 Aider、Cursor 为什么走了完全不同的路。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>仓库：gpt-engineer-org/gpt-engineer · Python · 55k+ star</span>
    <span>分析版本：截至 2026-06 main 分支</span>
    <span>本文覆盖：init/improve 流程、step pipeline、文件解析协议、preprompt 哲学</span>
  </div>
</section>

> **资料来源声明**：本文基于 [gpt-engineer-org/gpt-engineer](https://github.com/gpt-engineer-org/gpt-engineer) 的 main 分支真实源码（已 clone 到本地分析），所有文件路径、行号、函数签名从仓库直接读取。GPT Engineer 是 MIT 开源、Python 实现。注意：README 里作者明确说"如果你要找维护良好的 hackable CLI，去看 aider"——GPT Engineer 现在定位是"代码生成实验平台"，不是日常工具。但它的极简设计正是学习"早期 AI 编程范式"的好样本。

## 为什么值得读 GPT Engineer 源码

前面几篇剖析的都是"现代 Agent"——有工具循环、有自主探索、有 ReAct。GPT Engineer 是个反例，它代表了 2023 年的另一条路线。读它是为了理解一个根本性的设计选择：

```
- "一句话生成整个项目"和"迭代式编辑现有代码"——这是两种完全不同的范式，各适合什么场景？
- 在没有 tool calling 的 2023 年，怎么让 LLM 输出多个文件并解析？
- 为什么 GPT Engineer 几乎没有"循环"，主流程就是几个函数顺序调用？
- preprompt（预置提示词）驱动是什么意思？它和现代 Agent 的 system prompt 有何不同？
- 为什么这个范式后来"输给"了 Aider/Cursor 的迭代式编辑？
```

GPT Engineer 的价值在于它的**简单到极致**——整个核心逻辑就一百多行，没有任何花哨抽象。把它和前面的 Agent 对比，你能清晰看到"AI 编程"这两年从"生成"到"Agent"的范式迁移。

## 仓库总览

```
gpt-engineer/
├── gpt_engineer/
│   ├── core/                       # ★ 核心逻辑
│   │   ├── default/
│   │   │   ├── simple_agent.py     # ★ SimpleAgent：init + improve (100 行)
│   │   │   ├── steps.py            # ★ 流程步骤：gen_code/gen_entrypoint/execute (397 行)
│   │   │   ├── disk_memory.py      # 磁盘记忆（存日志和中间结果）
│   │   │   └── disk_execution_env.py  # 磁盘执行环境
│   │   ├── ai.py                   # LLM 封装（基于 LangChain）
│   │   ├── chat_to_files.py        # ★ 把 LLM 输出解析成文件 (245 行)
│   │   ├── files_dict.py           # FilesDict：文件名→内容的字典
│   │   ├── diff.py                 # diff 解析（improve 模式用）
│   │   └── prompt.py               # Prompt 数据模型
│   ├── preprompts/                 # ★ 预置提示词——GPT Engineer 的"灵魂"
│   │   ├── roadmap                 # 总纲
│   │   ├── generate                # 生成指令
│   │   ├── file_format             # 文件输出格式约定
│   │   ├── philosophy              # 代码风格哲学
│   │   ├── improve                 # 改进模式指令
│   │   └── entrypoint              # 入口脚本生成
│   ├── applications/cli/           # CLI 入口
│   ├── benchmark/                  # 评测
│   └── tools/
└── projects/                       # 生成的项目示例
```

**关键观察**：

**(1) `preprompts/` 目录是纯文本提示词文件**——这是 GPT Engineer 最独特的地方。它的"智能"几乎全部编码在这些预置提示词里，而不是代码逻辑里。代码只负责把这些 prompt 拼起来发给 LLM、解析返回。

**(2) `simple_agent.py` 只有 100 行**——对比 Cline 的 3764 行 Task 类、Browser Use 的 4132 行 Agent 类，GPT Engineer 的"Agent"简单得惊人。因为它根本没有循环和工具调度。

**(3) 没有 `tools/` 里的工具集、没有 ReAct loop**——GPT Engineer 不调用工具。它的全部交互就是"发 prompt → 收代码 → 写文件 → 跑一下"。

## 核心：init 与 improve 两个方法

GPT Engineer 的"Agent"是 `SimpleAgent`（`core/default/simple_agent.py:27`），整个类只有两个核心方法：

```python
# core/default/simple_agent.py:70-88 (简化)

class SimpleAgent(BaseAgent):
    def init(self, prompt: Prompt) -> FilesDict:
        """从零生成一个项目"""
        # 1. 根据 prompt 生成所有代码文件
        files_dict = gen_code(self.ai, prompt, self.memory, self.preprompts_holder)
        # 2. 生成一个入口脚本（怎么安装依赖、怎么运行）
        entrypoint = gen_entrypoint(self.ai, prompt, files_dict, self.memory, ...)
        combined_dict = {**files_dict, **entrypoint}
        return FilesDict(combined_dict)

    def improve(self, files_dict, prompt, execution_command=None) -> FilesDict:
        """改进现有代码"""
        files_dict = improve_fn(self.ai, prompt, files_dict, self.memory, ...)
        return files_dict
```

就这么简单。`init` 是"从一句话生成整个项目"，`improve` 是"对已有代码做修改"。两个方法，没有循环，没有工具决策。这和前面所有 Agent 都不同——它不是"模型决定下一步做什么"，而是"框架按固定流程走"。

## Step Pipeline：固定流程而非自主循环

`init` 里的 `gen_code`（`core/default/steps.py:121`）展示了 GPT Engineer 的全部"智能"是怎么运作的：

```python
# core/default/steps.py:121-150 (简化)

def gen_code(ai, prompt, memory, preprompts_holder) -> FilesDict:
    preprompts = preprompts_holder.get_preprompts()
    # 1. 拼系统提示词（roadmap + philosophy + file_format 等预置 prompt）
    messages = ai.start(
        setup_sys_prompt(preprompts),       # 系统提示词
        prompt.to_langchain_content(),       # 用户的需求描述
        step_name=curr_fn()
    )
    # 2. 拿到 LLM 的回复（一大段包含多个文件的文本）
    chat = messages[-1].content.strip()
    memory.log(CODE_GEN_LOG_FILE, ...)       # 记录到磁盘
    # 3. ★ 把回复解析成文件字典
    files_dict = chat_to_files_dict(chat)
    return files_dict
```

整个"生成项目"就是**一次 LLM 调用**：把预置提示词 + 用户需求拼成 prompt 发出去，LLM 一口气返回所有文件的代码，然后解析。没有"先看看有哪些文件、再决定改哪个"的探索过程——它假设 LLM 一次就能想清楚整个项目结构。

`gen_entrypoint`（`steps.py:153`）类似，它让 LLM 生成一个"怎么跑这个项目"的 unix 脚本：

```python
# 默认的 entrypoint 生成指令（steps.py:181-185）
user_prompt = """
Make a unix script that
a) installs dependencies
b) runs all necessary parts of the codebase (in parallel if necessary)
"""
```

然后 `execute_entrypoint`（`steps.py:205`）会问用户"要不要执行这段代码？(Y/n)"，确认后真的跑起来。这是 GPT Engineer 唯一接近"Agent"的部分——它能执行生成的代码。但即使这里，也只是"生成 → 跑一次"，不是"跑了看报错再修"的自主循环。

## 文件解析协议：FILENAME + 代码块

在没有 tool calling 的 2023 年，怎么让 LLM 一次输出多个文件、并准确解析？GPT Engineer 的方案是一个简单的文本协议，定义在 `preprompts/file_format`：

````text
You will output the content of each file necessary to achieve the goal,
including ALL code.
Represent files like so:

FILENAME
```
CODE
```

Example:
src/hello_world.py
```
print("Hello World")
```
````

LLM 被要求按"文件名一行，然后代码块"的格式输出。解析在 `chat_to_files.py:38` 的 `chat_to_files_dict`，核心就是一个正则：

```python
# core/chat_to_files.py:48-64 (简化)

def chat_to_files_dict(chat: str) -> FilesDict:
    # 匹配"文件路径 + 代码块"的正则
    regex = r"(\S+)\n\s*```[^\n]*\n(.+?)```"
    matches = re.finditer(regex, chat, re.DOTALL)

    files_dict = FilesDict()
    for match in matches:
        # 清理文件路径（去掉非法字符、方括号、反引号）
        path = re.sub(r'[\:<>"|?*]', "", match.group(1))
        path = re.sub(r"^\[(.*)\]$", r"\1", path)
        path = re.sub(r"^`(.*)`$", r"\1", path)
        content = match.group(2)
        files_dict[path.strip()] = content.strip()
    return files_dict
```

这个正则匹配"一个非空白的文件名，换行，然后一个代码块"。注意那几行 `re.sub`——它们在清理 LLM 经常犯的格式错误（文件名带方括号、带反引号、带非法字符）。这种"用正则解析 LLM 输出 + 一堆容错清理"是 tool calling 普及前的典型做法。对比现在的 function calling（结构化 JSON，框架保证格式），能看出这两年工具调用的标准化省了多少这种 hack。

`improve` 模式用的是 diff 格式（`preprompts/file_format_diff` + `chat_to_files.py:123` 的 `parse_diffs`）——因为改现有代码时让 LLM 重新输出整个文件太浪费，改用类 unified diff 的格式只描述变更。

## preprompt 驱动的设计哲学

GPT Engineer 最值得学的是它的 **preprompt 体系**。它把"怎么写好代码"的指导拆成几个独立的预置提示词文件，组合使用：

| preprompt | 内容 |
|---|---|
| `roadmap` | 总纲：整体任务流程 |
| `generate` | 生成指令：先列核心类/函数，再写完整代码 |
| `file_format` | 文件输出格式约定 |
| `philosophy` | 代码风格：不同类放不同文件、写 requirements.txt、加注释 |
| `improve` | 改进模式指令 |
| `entrypoint` | 入口脚本生成 |

看 `philosophy` 的内容（很能体现这种"把工程经验编码进 prompt"的思路）：

```
Almost always put different classes in different files.
Always use the programming language the user asks for.
For Python, you always create an appropriate requirements.txt file.
For NodeJS, you always create an appropriate package.json file.
Always add a comment briefly describing the purpose of the function definition.
...
Python toolbelt preferences:
- pytest
- dataclasses
```

`generate` 里还有一个很重要的引导（chain-of-thought 思路）：

```
Think step by step and reason yourself to the correct decisions to make sure
we get it right.
First lay out the names of the core classes, functions, methods that will be
necessary, as well as a quick comment on their purpose.
...
You will start with the "entrypoint" file, then go to the ones that are
imported by that file, and so on.
```

这里的设计很聪明：**让 LLM 先列出所有类和函数的骨架（带注释说明用途），再写完整实现**。这是 CoT（Chain-of-Thought）在代码生成上的应用——先规划架构，再填代码，比直接生成质量更高。而且要求"从 entrypoint 文件开始，按 import 顺序写"，帮助 LLM 保持文件间的一致性。

把工程经验和最佳实践编码进 preprompt，而不是写进代码逻辑——这是 GPT Engineer 的核心方法论。它本质上是用 prompt engineering 替代了 agent engineering。

## 为什么"一次性生成"输给了"迭代式 Agent"

GPT Engineer 2023 年很火，但现在大家日常用的是 Aider、Cursor、Claude Code 这些迭代式工具。为什么？这个对比很有面试价值：

| 维度 | GPT Engineer（一次性生成） | Aider/Cursor（迭代式 Agent） |
|---|---|---|
| 工作方式 | 一句话 → 整个项目 | 对现有代码逐步修改 |
| 适用场景 | 从零起一个小 demo/原型 | 在真实代码库里持续开发 |
| 上下文 | 只有用户的一句话描述 | 能看代码库、跑测试、读报错 |
| 纠错 | 生成完就结束，错了重来 | 跑测试 → 看报错 → 修复的循环 |
| 控制粒度 | 粗（整个项目一把生成） | 细（一次改几行，可 review） |
| 失败模式 | 项目大了就崩（LLM 一次想不清） | 渐进式，单步可控 |

核心区别：**GPT Engineer 假设 LLM 能"一次想清楚整个项目"，迭代式 Agent 假设 LLM 会犯错、需要反馈循环来纠正**。现实是后者的假设更对——软件开发本质是迭代的，真实项目大到没有任何模型能一次生成正确。GPT Engineer 在"几十行的玩具项目"上效果惊艳，但项目稍大就力不从心，因为它没有"生成 → 测试 → 修复"的闭环。

这正是 SWE-agent 论文强调的：**反馈循环（reproduce → fix → verify）比一次性生成更重要**。GPT Engineer 缺的就是这个循环。它是一个时代的产物——证明了"AI 能写代码"，但也暴露了"一次性生成"的天花板，反向推动了整个行业转向迭代式 Agent。

## 容易踩的坑

**1. 项目稍大就生成不完整**

- **现象**：让它生成一个稍复杂的项目，某些文件只有骨架或 `# TODO`，跑不起来
- **根因**：一次 LLM 调用的输出长度有限，项目大了就被截断或模型"偷懒"
- **修法**：preprompt 里反复强调"No placeholders""fully functional""double check all parts"就是在对抗这个。但根本上一次性生成有上限——大项目应该用迭代式工具

**2. 文件解析失败**

- **现象**：LLM 输出的格式不标准（文件名带了多余符号、代码块标记不对），解析出错或丢文件
- **根因**：LLM 不总是严格遵守 FILENAME + 代码块的格式
- **修法**：`chat_to_files_dict` 里那一串 `re.sub` 就是容错。但正则解析天然脆弱——这也是为什么现代 Agent 都转向 tool calling（结构化输出，框架保证格式）

**3. 生成的代码直接执行有风险**

- **现象**：`execute_entrypoint` 会真的跑生成的代码
- **根因**：LLM 生成的脚本可能有副作用（删文件、装包、联网）
- **修法**：GPT Engineer 在执行前会问 "Do you want to execute this code? (Y/n)"。但它没有 Codex 那种 OS 沙箱——生产环境跑陌生生成的代码应该隔离

## 面试题深度解析

**Q1: "一次性生成整个项目"和"迭代式 Agent"是两种什么范式？各适合什么？**

- **30 秒版本**：GPT Engineer 代表"一次性生成"——一句话描述，LLM 一把生成所有文件，适合从零起小 demo/原型。Aider/Cursor 代表"迭代式 Agent"——对现有代码逐步修改，有"生成 → 测试 → 修复"的反馈循环，适合真实项目持续开发。核心区别是后者假设 LLM 会犯错、需要反馈纠正，前者假设 LLM 一次能想清楚。
- **追问：为什么迭代式胜出了？** 因为软件开发本质是迭代的，真实项目大到没有模型能一次生成正确。一次性生成在玩具项目上惊艳，但缺反馈循环，项目一大就崩。SWE-agent 论文也证明了反馈循环（reproduce→fix→verify）的关键价值。
- **追问：一次性生成还有用武之地吗？** 有——快速原型、脚手架生成、教学 demo。当你要的就是"快速看到一个能跑的雏形"而非"生产级代码"，一次性生成更快。两种范式是互补而非替代。

**Q2: 在没有 tool calling 的 2023 年，GPT Engineer 怎么让 LLM 输出多文件并解析？**

- **30 秒版本**：定义一个文本协议——"文件名一行，然后 markdown 代码块"。LLM 按这个格式输出所有文件，框架用正则解析成"文件名→内容"的字典。再加一堆 `re.sub` 容错清理 LLM 的格式错误。
- **追问：这种方案的问题？** 正则解析脆弱，LLM 格式稍有偏差就解析失败或丢文件。容错代码（清理文件名里的非法字符、方括号、反引号）就是在打补丁。这正是 tool calling 要解决的——结构化 JSON 输出，框架保证格式，不用正则猜。
- **追问：improve 模式为什么用 diff？** 改现有代码时让 LLM 重新输出整个文件太浪费 token，改用类 unified diff 格式只描述变更行。这和 Aider 的 SEARCH/REPLACE、Codex 的 apply_patch 是同类思路——增量编辑而非全量重写。

**Q3: preprompt 驱动是什么意思？和现代 Agent 的 system prompt 有何不同？**

- **30 秒版本**：GPT Engineer 把"怎么写好代码"的指导拆成独立的预置提示词文件（philosophy、generate、file_format 等），组合成系统提示词。它的"智能"几乎全在这些 prompt 里，代码只负责拼装和解析。本质是用 prompt engineering 替代 agent engineering。
- **追问：和现代 Agent 的区别？** 现代 Agent 的 system prompt 主要定义"行为规则 + 工具用法"，智能体现在"模型自主用工具探索"的循环里。GPT Engineer 没有工具循环，所以它必须把所有指导一次性塞进 prompt——包括架构规划（先列类再写代码）、代码风格、文件格式。它是"无循环 Agent"，全靠 prompt 引导单次生成。
- **追问：这种方法的优劣？** 优点是简单透明、易修改（改 prompt 文件就行，不用动代码）。缺点是上限低——单次生成无法处理需要探索和纠错的复杂任务。

## 延伸阅读

- **[gpt-engineer-org/gpt-engineer](https://github.com/gpt-engineer-org/gpt-engineer)** — 仓库本身。重点读 `gpt_engineer/preprompts/` 下的几个提示词文件（philosophy、generate、file_format），它们浓缩了"如何用 prompt 引导 LLM 写好代码"的早期经验
- **[GPT Engineer 的 preprompts 目录](https://github.com/gpt-engineer-org/gpt-engineer/tree/main/gpt_engineer/preprompts)** — 单独拎出来读。这是 prompt engineering 的活教材，比看代码逻辑收获更大
- **[Aider 源码剖析](./aider)** — 迭代式 Agent 的对照。Aider 的作者 Paul Gauthier 和 GPT Engineer 的 README 互相推荐——GPT Engineer 说"要日常工具去用 aider"。两者代表了"生成"和"迭代"两条路线，对比读能看清范式迁移
- **[SWE-agent 源码剖析](./swe-agent)** — 反馈循环的对照。SWE-agent 强调"reproduce → fix → verify"循环，正是 GPT Engineer 缺失的部分。理解这个循环为什么重要，就理解了一次性生成的天花板
- **[Cline 源码剖析](./cline)** — 现代 IDE Agent 的对照。从 GPT Engineer 的 100 行 SimpleAgent 到 Cline 的 3764 行 Task 类，能直观看到"无循环生成"到"完整 Agent"的复杂度跃迁
