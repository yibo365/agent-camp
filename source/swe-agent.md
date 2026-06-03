---
title: SWE-agent 源码剖析
description: SWE-agent 是 Princeton 团队 2024 年提出的学术 SOTA 编程 Agent（NeurIPS 论文 2405.15793），它提出的 ACI（Agent-Computer Interface）概念——为 LLM 而非人类设计的命令行界面——深刻影响了后续所有编程 Agent。本文从 agents.py 的极简主循环出发，拆解 ACI 设计哲学、windowed file viewer、edit 命令的 lint 反馈、bash 工具即命令、以及 SWE-bench 评测框架。
pageClass: source-swe-agent-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">Agent 源码解析</p>
  <h1>SWE-agent 源码剖析</h1>
  <p class="doc-hero__lead">SWE-agent 是 Princeton NLP 团队（也是 SWE-bench 的作者）2024 年的研究成果。它不是产品，是一篇 NeurIPS 论文的代码实现——但它提出的核心概念 <strong>ACI（Agent-Computer Interface，智能体-计算机接口）</strong> 影响了之后所有编程 Agent。ACI 的洞察是：LLM 不是人，不该用为人设计的工具（vim、less、grep 的原始输出）。给 LLM 设计专门的、简洁的、带反馈的命令界面，比换一个更强的模型更能提升成功率。读 SWE-agent 源码是为了理解这个"工具设计 > 模型能力"的反直觉结论是怎么用代码落地的。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>仓库：SWE-agent/SWE-agent · Python · 学术 SOTA · arxiv 2405.15793</span>
    <span>分析版本：截至 2026-06 main 分支</span>
    <span>本文覆盖：ACI 设计、极简主循环、windowed file、edit + lint、SWE-bench</span>
  </div>
</section>

> **资料来源声明**：本文基于 [SWE-agent/SWE-agent](https://github.com/SWE-agent/SWE-agent) 的 main 分支真实源码（已 clone 到本地分析），以及论文 [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](https://arxiv.org/abs/2405.15793)（NeurIPS 2024）。所有文件路径、行号、函数签名从仓库直接读取。SWE-agent 是 MIT 开源、Python 实现。注意：团队当前主力开发已转向更简洁的 [mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent)，但原版 SWE-agent 的 ACI 设计是这个领域的奠基性工作，仍是最值得精读的样本。

## 为什么值得读 SWE-agent 源码

SWE-agent 和前面几个 Agent（Claude Code、Codex、Cline）不一样——它是学术界产物，目标是在 SWE-bench 上刷分，不是做产品。这反而让它的设计更纯粹，更适合学习核心原理：

```
- 论文说"ACI 比换更强的模型还重要"——这个反直觉结论怎么用代码证明？
- 为什么 SWE-agent 给 LLM 一个"只显示 100 行的文件查看器"而不是让它 cat 整个文件？
- edit 命令为什么在每次编辑后自动跑 flake8 lint，把错误反馈给模型？
- 主循环为什么可以只有 5 行（while not done: step()）？
- 为什么 SWE-agent 的"工具"是 bash 命令（open/goto/scroll/edit）而不是 function calling？
- SWE-bench 怎么自动判断一个 patch 修对了 issue？
```

读 SWE-agent 最大的收获不是某个具体技术，而是一个思维方式的转变：**当你的 Agent 效果不好，第一反应不该是"换个更强的模型"，而是"我的工具界面对 LLM 友好吗"**。

## ACI：为 LLM 设计的命令行界面

这是整篇论文的核心，也是理解 SWE-agent 全部代码的钥匙。

### 问题：人类的工具对 LLM 很糟糕

设想让 GPT-4 去修一个 GitHub issue。最直接的做法是给它一个 bash shell，让它像人一样用 `vim`、`cat`、`grep`、`sed`。但这有几个问题：

1. **`cat` 一个 2000 行的文件**：整个文件灌进 context，淹没模型，而且大部分内容无关
2. **`vim` 是交互式的**：LLM 没法处理 vim 的模式切换和实时光标
3. **`sed` 改文件后没反馈**：模型不知道改对没有，改完语法错了也不知道
4. **`grep` 的原始输出**：一大堆文件路径和行号，格式对模型不友好

论文的洞察：这些工具是几十年前为**人类**设计的。人有眼睛能扫描、有手能滚动、有 IDE 能高亮。LLM 没有这些——它只有一个文本输入输出通道。所以应该为 LLM 重新设计一套界面。

### 解法：精简、带反馈、有状态的命令

SWE-agent 给 LLM 的不是原始 bash，而是一套专门设计的命令（`tools/` 目录下，每个命令是一个脚本）：

| 命令 | 作用 | ACI 设计点 |
|---|---|---|
| `open <file>` | 打开文件，只显示一个窗口（默认 100 行） | 不灌整个文件，分窗口 |
| `goto <line>` | 跳到某行 | 不用 vim 的复杂导航 |
| `scroll_down` / `scroll_up` | 滚动窗口 | 窗口间有 overlap，不漏内容 |
| `edit <search>/<replace>` | 编辑当前文件 | 编辑后自动 lint 反馈 |
| `search_file` / `search_dir` | 搜索 | 格式化的、紧凑的结果 |
| `submit` | 提交答案 | 触发 review 流程 |

关键：**这些命令有状态**。`open` 之后，"当前文件"和"当前窗口"被记住，`scroll_down` 基于当前窗口滚动，`edit` 作用于当前文件。这和无状态的 function calling 不同——它更像给 LLM 一个简化版的"编辑器会话"。

## 极简主循环

理解了 ACI，再看主循环会发现它简单得惊人。`sweagent/agent/agents.py:1284`：

```python
# sweagent/agent/agents.py:1281-1287

# Run action/observation loop
self._chook.on_run_start()
step_output = StepOutput()
while not step_output.done:        # ← 整个 Agent 的主循环就这一行
    step_output = self.step()
    self.save_trajectory()
self._chook.on_run_done(trajectory=self.trajectory, info=self.info)
```

为什么这么简单？因为复杂度全都下沉到了 ACI（工具层）。主循环只做一件事：反复调 `step()` 直到 `done`。每个 `step()`（`agents.py:1235`）做：

```python
# sweagent/agent/agents.py:1235-1263 (简化)

def step(self) -> StepOutput:
    # 1. forward：调模型，解析出 thought 和 action
    step_output = self.forward_with_handling(self.messages)
    # 2. 把 action 和 observation 加到 history
    self.add_step_to_history(step_output)
    # 3. 记录 trajectory（用于复现和评测）
    self.add_step_to_trajectory(step_output)
    return step_output
```

核心在 `forward`（`agents.py:1006`）——它体现了 ReAct 的 thought + action 结构：

```python
# sweagent/agent/agents.py:1042-1052 (简化)

output = self.model.query(history)
step.output = output["message"]
# ★ 把模型输出解析成 thought（自然语言推理）和 action（要执行的命令）
step.thought, step.action = self.tools.parse_actions(output)
self.logger.info(f"💭 THOUGHT\n{step.thought}\n\n🎬 ACTION\n{step.action.strip()}")
return self.handle_action(step)
```

每一步模型先输出一段 `thought`（在想什么），再输出一个 `action`（一条命令，比如 `open src/foo.py` 或 `edit ...`）。`handle_action` 在环境里执行这条命令，把输出（observation）喂回模型。这就是经典的 ReAct loop——SWE-agent 是 ReAct 思想在编程任务上的工业级实现。

### 错误时 requery：不浪费一步

`forward_with_handling`（`agents.py:1062`）有个聪明设计：如果模型输出的 bash 命令有语法错误，**不执行也不算一步**，而是直接 requery 模型让它改：

> Note 注释（agents.py:1063-1065）："if the model outputs a bash command that has syntax errors, we will not execute it but requery the model for a corrected command."

这避免了一个常见浪费——模型打错命令，环境返回一个 shell 报错，模型再花一步去理解报错、改命令。SWE-agent 直接拦截语法错误，原地让模型重试，省下宝贵的步数（Agent 的总步数是有限预算）。

## Windowed File：不灌整个文件

ACI 最具代表性的实现是"窗口化文件查看器"。`tools/windowed/lib/windowed_file.py` 里的 `WindowedFile` 类，默认窗口 100 行（`WINDOW` 变量，`windowed_file.py:101`）。

打开文件时，不显示全部，只显示窗口范围，并明确告诉模型上下还有多少行（`windowed_file.py:164-174`）：

```python
# tools/windowed/lib/windowed_file.py:164-174 (简化)

out_lines.append(f"[File: {self.path} ({self.n_lines} lines total)]")
# ... 显示窗口内的行 ...
if end_line < self.n_lines - 1:
    out_lines.append(f"({self.n_lines - end_line - 1} more lines below)")
```

模型看到的是这样：

```
[File: src/config.py (347 lines total)]
(120 more lines above)
121: def parse_config(path):
122:     raw = open(path).read()
...
220:     return config
(127 more lines below)
```

为什么这样设计？

1. **不淘空 context**：347 行的文件只显示 100 行，省 token，也让模型聚焦
2. **明确的导航信号**："120 more lines above / 127 more lines below" 告诉模型该往哪滚
3. **带行号**：每行前缀行号，让 `goto` 和 `edit` 能精确定位

滚动时窗口间有 **overlap**（`windowed_file.py:270-274`）——`scroll_down` 不是跳一整屏，而是留几行重叠，避免模型漏掉跨窗口边界的代码。这种细节正是 ACI 的精髓：处处考虑"LLM 怎么用着不别扭"。

## edit 命令：编辑后自动 lint

如果说 windowed file 是 ACI 的"输入端"设计，`edit` 命令就是"输出端"的精华。它做了三件别的 Agent 没做的事：

### 1. search/replace + 精确的失败反馈

`edit` 用 search/replace（类似 Cline）。但它的失败提示极其用心（`tools/windowed_edit_replace/bin/edit:22-40`）：

```python
# tools/windowed_edit_replace/bin/edit (错误消息模板)

_NOT_FOUND = """Your edit was not applied (file not modified):
Text {search!r} not found in displayed lines (or anywhere in the file).
Please modify your search string.
Did you forget to properly handle whitespace/indentation?
You can also call `open` again to re-display the file with the correct context."""

_MULTIPLE_OCCURRENCES_MSG = """Your edit was not applied (file not modified):
Found more than one occurrence of {search!r} in the currently displayed lines.
Please make your search string more specific (for example, by including more lines of context)."""
```

注意这些消息的设计：不只说"失败了"，而是**告诉模型为什么失败、下一步该怎么做**——"是不是忘了处理缩进？""可以重新 open 看上下文""搜索串太宽泛，加几行上下文"。这是把"调试经验"编码进工具反馈里。当搜索串在窗口外但文件内存在时，它还会列出所有出现位置，提示用 `goto` 先导航过去（`_NOT_FOUND_IN_WINDOW_MSG`）。

### 2. 编辑后自动跑 flake8

这是 SWE-agent 最被低估的设计。每次 `edit` 成功后，它自动对改动区域跑 flake8 lint（`tools/windowed/lib/flake8_utils.py`），把 lint 错误反馈给模型：

```python
# 编辑成功后的反馈（简化）

_SINGLE_EDIT_SUCCESS_MSG = """Text replaced. Please review the changes
and make sure they are correct:
1. The edited file is correctly indented
2. The edited file does not contain duplicate lines
3. The edit does not break existing functionality
Edit the file again if necessary."""
```

`flake8_utils.py:60` 的 `_update_previous_errors` 做了一件精细的事：它对比编辑**前后**的 lint 错误，只报告"新引入的"错误，不报告本来就存在的。这样模型不会被一堆历史遗留的 lint warning 干扰，只看到自己这次编辑造成的问题。

为什么这很重要？因为 LLM 改代码最常见的 bug 是**缩进错误**（尤其 Python）。没有 lint 反馈时，模型改完以为成功了，结果引入了 `IndentationError`，要等下一次跑代码才发现。有了即时 lint，模型当场就能修正。论文的消融实验证明：去掉 lint 反馈，SWE-bench 成功率明显下降。

## 工具即命令：bash 而非 function calling

SWE-agent 的"工具"不是 JSON function calling，而是 **bash 命令**。`tools/` 目录下每个命令是一个可执行脚本（Python 或 shell），通过 `registry` 注册成环境里的命令。

模型输出的 action 是一条 bash 命令字符串：

```
open src/config.py
goto 121
edit
...search...
...replace...
end_of_edit
python reproduce_bug.py
```

环境（`SWEEnv`，跑在 Docker 容器里）执行这条命令，返回 stdout/stderr 作为 observation。这种"工具即 shell 命令"的设计有几个好处：

1. **可组合**：模型可以用管道、重定向组合命令（`grep ... | head`）
2. **真实环境**：直接在真实的代码仓库里跑，不是模拟
3. **易扩展**：加一个工具就是加一个脚本，不用改 Agent 核心代码（`config/default.yaml` 的 `bundles` 列出要加载的工具包）

这和 Codex/Claude Code 的 function calling 路线相反。SWE-agent 押注的是"LLM 本来就在海量 bash 脚本上训练过，让它用 shell 比让它生成结构化 JSON 更自然"。

## 系统提示词：极简

值得一看的是 SWE-agent 的 system prompt 有多短（`config/default.yaml:6-7`）：

```yaml
system_template: |-
  You are a helpful assistant that can interact with a computer to solve tasks.
```

就一句话。复杂的引导全在 instance template 里——它给了一个清晰的 5 步工作流（`config/default.yaml`）：

```
1. 先找到并阅读和 PR 描述相关的代码
2. 写一个复现脚本，用 python 跑确认 bug 存在
3. 改源码修复
4. 重跑复现脚本确认修好了
5. 考虑边界情况，确保 fix 也能处理
```

注意第 2 步和第 4 步——**强制模型先写复现脚本**。这是软件工程的最佳实践（先写测试再改代码），SWE-agent 把它编码进了 prompt。模型不是瞎改，而是先证明 bug 存在、改完再证明 bug 消失。这个"reproduce → fix → verify"循环是 SWE-agent 在 SWE-bench 上成功的关键之一。

## SWE-bench：怎么自动评测

SWE-agent 和 SWE-bench 是同一个团队的配套作品。SWE-bench 是评测基准：从真实 GitHub 仓库（django、sympy、scikit-learn 等）选取 2000+ 个真实 issue，每个 issue 有对应的"正确修复 PR"和"测试用例"。

评测流程：

1. 给 Agent 一个 issue 描述和代码仓库的某个历史 commit（issue 还没修复的状态）
2. Agent 自主探索、修改代码，最后 `submit` 一个 patch
3. 把 patch 应用到仓库，跑该 issue 对应的测试用例
4. **测试通过 = 修对了**（FAIL_TO_PASS：之前失败的测试现在通过；PASS_TO_PASS：之前通过的测试不能被改坏）

这个评测的精妙在于**完全自动、客观**——不需要人判断 patch 好不好，直接用测试结果说话。`submit` 前还有一个 review 流程（`tools/review_on_submit_m`），提示模型删掉复现脚本、还原对测试文件的修改（`config/default.yaml` 的 `SUBMIT_REVIEW_MESSAGES`）——因为 SWE-bench 规则要求只改非测试文件。

## 与产品级 Agent 的区别

| 维度 | SWE-agent（学术） | Claude Code / Codex（产品） |
|---|---|---|
| 目标 | SWE-bench 刷分，验证 ACI 假设 | 真实用户日常编程 |
| 工具形态 | bash 命令（open/goto/edit/scroll） | function calling（结构化工具） |
| 文件查看 | windowed（窗口 100 行） | 整文件 Read（默认 2000 行） |
| 编辑反馈 | 自动 flake8 lint | 无内置 lint（靠用户的 hook） |
| 主循环 | 极简 while not done | 复杂的流式 + 权限 + 压缩 |
| 运行环境 | Docker 容器（隔离评测） | 用户本地机器 |
| 交互 | 全自动，无人介入 | 人在回路（审批、Plan 模式） |

SWE-agent 的价值不在于"能直接用"，而在于它**用受控实验证明了一些设计原则**：ACI 比模型能力更重要、lint 反馈能提升成功率、窗口化查看比全文件更好。这些原则后来被产品级 Agent 吸收——Claude Code 的 Read 默认 2000 行（窗口化的变体）、各家都强调工具反馈质量，都能追溯到 SWE-agent 的论文。

## 容易踩的坑

**1. 窗口太小导致模型"管中窥豹"**

- **现象**：模型反复 scroll，始终看不全一个长函数，编辑时缺上下文
- **根因**：默认 100 行窗口对某些超长函数不够，模型要滚好几次
- **修法**：`WINDOW` 变量可配置。但调大窗口会增加 token 消耗——这是 ACI 的核心权衡：窗口越大上下文越全，但越淹没模型。SWE-agent 选 100 是实验调出来的平衡点

**2. edit 的 search 串在窗口外找不到**

- **现象**：模型想改的代码不在当前窗口，edit 报"not found in displayed lines"
- **根因**：`edit` 默认只在当前显示的窗口内搜索，不是全文件
- **修法**：这是有意设计——强制模型先 `goto` 到正确位置再编辑，避免盲改。错误消息会列出该搜索串在文件别处的位置，引导模型导航过去

**3. 把复现脚本留在提交里**

- **现象**：SWE-bench 评测失败，因为提交的 patch 包含了 `reproduce_bug.py`
- **根因**：模型写了复现脚本但忘了删，patch 里多了无关文件
- **修法**：SWE-agent 的 `review_on_submit` 流程专门在 submit 前提醒删除复现脚本、还原测试文件改动——这是从大量失败案例里总结出的 checklist

## 面试题深度解析

**Q1: 什么是 ACI（Agent-Computer Interface）？为什么说它比模型能力更重要？**

- **30 秒版本**：ACI 是为 LLM（而非人类）专门设计的工具界面。论文的核心发现是：同一个模型，配上精心设计的 ACI（窗口化文件、带反馈的 edit、紧凑的搜索结果），SWE-bench 成功率能从个位数提升到两位数——提升幅度比换一个更强的模型还大。原因是人类工具（vim/cat/grep）的输出对 LLM 不友好，淹没 context 且缺反馈。
- **追问：ACI 的具体设计原则？** 三条：①控制信息量（窗口化，不灌整个文件）；②即时反馈（edit 后自动 lint）；③格式化输出（搜索结果紧凑、带行号）。核心是"减少 LLM 的认知负担"。
- **追问：这对做产品 Agent 有什么启发？** 当 Agent 效果差，先别急着换模型——审视工具反馈质量。一个返回清晰错误信息、控制输出长度的工具，比一个返回原始 stderr 的工具能让同样的模型表现好很多。

**Q2: SWE-agent 的主循环为什么能这么简单（while not done: step()）？**

- **30 秒版本**：因为复杂度都下沉到了 ACI（工具层）。主循环只负责"反复调模型直到完成"，而"怎么让模型用好工具"的复杂性全在工具的设计里——windowed file、lint 反馈、错误提示。这是好的架构分层：循环管控制流，工具管能力和反馈。
- **追问：和 ReAct 的关系？** SWE-agent 就是 ReAct 在编程任务上的实现。每步 `forward` 解析出 thought（推理）和 action（命令），执行后把 observation 喂回——thought/action/observation 正是 ReAct 的三要素。
- **追问：requery 机制是什么？** 如果模型输出的命令有语法错误，SWE-agent 不执行也不计入步数，直接让模型重试。这省下了"模型打错 → 看报错 → 改命令"的浪费，因为 Agent 的总步数是有限预算。

**Q3: 为什么 edit 命令要在编辑后自动跑 lint？**

- **30 秒版本**：因为 LLM 改代码最常见的错误是缩进/语法错误（尤其 Python），没有即时反馈的话模型改完以为成功，要等下次运行才发现。自动 lint 让模型当场看到自己引入的错误并修正。论文消融实验证明去掉 lint 反馈会显著降低成功率。
- **追问：怎么避免 lint 噪音？** SWE-agent 对比编辑前后的 lint 结果，只报告"新引入的"错误，过滤掉本来就存在的历史 warning。这样模型只关注自己造成的问题，不被无关 warning 淹没。
- **追问：这和 Aider 的 auto-lint 有什么异同？** 思路一致（编辑后自动检查），但 Aider 是 lint 整个文件后让模型决定要不要修，SWE-agent 是精确到改动区域、只报新错误，反馈更聚焦。两者都验证了"编辑+验证"闭环的价值。

## 延伸阅读

- **[SWE-agent 论文 (arxiv 2405.15793)](https://arxiv.org/abs/2405.15793)** — 必读。ACI 概念的原始出处，第 4 节的消融实验（ablation）量化证明了窗口化、lint 反馈各自的贡献，是"工具设计 > 模型能力"论断的实证
- **[SWE-bench 论文 (arxiv 2310.06770)](https://arxiv.org/abs/2310.06770)** — 配套的评测基准。理解 FAIL_TO_PASS / PASS_TO_PASS 评测逻辑，这是现在所有编程 Agent 都在刷的榜
- **[SWE-agent/SWE-agent](https://github.com/SWE-agent/SWE-agent)** — 仓库本身。重点读 `tools/windowed/lib/windowed_file.py`（窗口化实现）和 `tools/windowed_edit_replace/bin/edit`（edit + lint），这是 ACI 思想最集中的两个文件
- **[mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent)** — 团队的新方向。用更少的代码达到同等性能，体现了"Agent 应该简单"的理念演进。和原版对比读，能看到这个领域两年间对"什么是必要复杂度"的认知变化
- **[Cline 源码剖析](./cline)** — search/replace 编辑的对照。SWE-agent 的 edit 和 Cline 的 SEARCH/REPLACE 都用搜索替换，但 SWE-agent 多了窗口约束和 lint 反馈，对比能看出学术与产品的设计侧重差异
