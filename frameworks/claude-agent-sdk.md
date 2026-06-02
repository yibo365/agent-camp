---
title: Claude Agent SDK 深度剖析
description: Anthropic 官方 Agent SDK——Claude Code 的内核被剥离成可复用 SDK、内置工具集（Bash/Read/Edit/Glob/Grep/WebFetch）、Hooks 系统、subagents、permission flow，以及它和 Anthropic SDK 的本质区别。
pageClass: frameworks-claude-agent-sdk-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">主流 Agent 框架</p>
  <h1>Claude Agent SDK 深度剖析</h1>
  <p class="doc-hero__lead">Claude Agent SDK 不是又一个"调 API 的 wrapper"——它是 Anthropic 把 Claude Code 内核单独剥离出来的 SDK，自带文件系统工具、Bash 沙箱、Hooks 系统、permission flow 和 subagent 编排。如果你想做一个像 Claude Code 那样能自主编程的 Agent，这是离 Claude Code 最近的捷径。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：进阶 / 生产</span>
    <span>核心链路：Query → Tools → Hooks → Subagents → Permission</span>
    <span>面试重点：和 Anthropic SDK 边界 + Hooks 机制 + 内置工具集</span>
  </div>
</section>

> **本文边界**：聚焦 Claude Agent SDK 的内核架构、Hooks、subagents 和 permission flow。Anthropic API 本身的细节见 [函数调用规范](../tools/function-calling)；Claude Code 客户端的源码解析见 [Claude Code 源码](../source/claude-code)；MCP 的协议层见 [MCP 详解](../tools/mcp)。

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>Claude Agent SDK 和 Anthropic 的官方 SDK（anthropic-sdk-python）有什么本质区别？</strong>
    <span>考层次理解——Anthropic SDK 是 API 客户端（messages.create），Agent SDK 是 Agent 运行时（含工具、循环、Hooks、subagents）。</span>
  </div>
  <div>
    <strong>Agent SDK 内置的工具集（Bash/Read/Edit/Glob/Grep/WebFetch）为什么是这几个？少了/多了会怎样？</strong>
    <span>考工具最小集的设计直觉——这是"读 + 写 + 执行 + 检索"的最小完备集，能让 Agent 完成绝大部分编程任务。</span>
  </div>
  <div>
    <strong>Hooks 系统在哪些时机触发？和拦截器/中间件是一回事吗？</strong>
    <span>考事件模型——PreToolUse / PostToolUse / Stop 等多个时机，可以中断、修改、增强 Agent 行为。</span>
  </div>
  <div>
    <strong>subagent 和主 Agent 之间怎么传递信息？为什么不直接共享 context？</strong>
    <span>考多 Agent 隔离设计——subagent 有独立 context（防污染主对话），通过 prompt + 返回结果通信。</span>
  </div>
  <div>
    <strong>Permission flow 是怎么工作的？它和 OAuth 的 scope 有什么类比关系？</strong>
    <span>考权限模型——四种 mode（acceptEdits/bypassPermissions/default/plan），每种代表不同的信任级别。</span>
  </div>
  <div>
    <strong>为什么 Anthropic 要单独做这个 SDK，而不是让大家用 LangGraph 或者自己写循环？</strong>
    <span>考产品战略——SDK 把 Claude Code 的"工程最佳实践"工业化、标准化，降低复刻成本。</span>
  </div>
  <div>
    <strong>SDK 同时支持 TypeScript 和 Python，两套实现有差异吗？怎么保持一致？</strong>
    <span>考工程实践——核心循环和工具语义对齐，但生态集成（如 MCP server）有差别。</span>
  </div>
</div>

---

## 为什么需要 Claude Agent SDK

很多人第一次听说时会问："Anthropic 不是已经有 SDK 了吗？为什么还要再做一个？"

先看看用 `anthropic-sdk-python` 做一个"能改文件的 Agent"要写多少代码：

```python
import anthropic
import subprocess
import json

client = anthropic.Anthropic()

# 1. 定义工具 schema
tools = [
    {"name": "read_file", "description": "...", "input_schema": {...}},
    {"name": "write_file", "description": "...", "input_schema": {...}},
    {"name": "bash", "description": "...", "input_schema": {...}},
    # ... 还需要 grep, glob, edit, web_fetch
]

# 2. 实现每个工具的执行逻辑
def execute_tool(name, args):
    if name == "read_file":
        return open(args["path"]).read()
    elif name == "write_file":
        # 要不要 diff？要不要权限确认？大文件怎么处理？
        ...
    elif name == "bash":
        # 超时？工作目录？环境变量？是否允许 rm -rf？
        ...

# 3. 实现 agent loop
messages = [{"role": "user", "content": "..."}]
while True:
    response = client.messages.create(model="claude-...", messages=messages, tools=tools)
    if response.stop_reason == "end_turn":
        break
    # 处理 tool_use 块
    for block in response.content:
        if block.type == "tool_use":
            result = execute_tool(block.name, block.input)
            messages.append({"role": "user", "content": [{"type": "tool_result", "tool_use_id": block.id, "content": result}]})

# 4. 缺失的东西：
#    - 权限确认（用户能不能在 bash 执行前批准？）
#    - 错误处理（工具报错怎么反馈给 LLM？）
#    - 大文件分页读取（一次性读 100MB 会爆 context）
#    - subagent（任务分解）
#    - 上下文压缩（长对话怎么办？）
#    - Hooks（在工具执行前后插入自定义逻辑）
```

这就是为什么需要 Agent SDK——**它把"做一个像 Claude Code 那样的 Agent"所需的工程化能力打包好**。你不需要重新设计 read_file 在大文件场景的分页逻辑、不需要重新发明 permission flow、不需要从零实现 subagent 调度。

---

## Anthropic SDK vs Agent SDK：两个层次

很多人混淆，必须分清：

```
┌──────────────────────────────────────────────────┐
│  Claude Agent SDK                                 │
│  ├─ Agent loop（自动循环 + 工具调度）              │
│  ├─ 内置工具集（Bash/Read/Edit/Glob/Grep/...）    │
│  ├─ Hooks 系统（PreToolUse/PostToolUse/...）      │
│  ├─ Subagents（任务委派）                          │
│  ├─ Permission flow（权限审批）                    │
│  └─ MCP client（连接外部 MCP server）              │
└──────────────────┬───────────────────────────────┘
                   │ 内部使用
                   ▼
┌──────────────────────────────────────────────────┐
│  Anthropic SDK（anthropic-sdk-python/js）          │
│  ├─ messages.create()                             │
│  ├─ messages.stream()                             │
│  ├─ 缓存、批量、文件 API                           │
│  └─ 纯 HTTP 客户端                                 │
└───────────────────────────────────────────────────┘
```

类比：Anthropic SDK 是 `requests` 库，Agent SDK 是 Flask/FastAPI。前者是底层调用，后者是带框架的应用层。

**什么时候用哪个？**

- 一次性对话、不涉及工具、纯文本生成 → 用 Anthropic SDK，更轻
- 需要 Agent 自主调用工具、循环执行、有 hooks/permissions/subagents → 用 Agent SDK

---

## 内置工具集：最小完备的工程化设计

Agent SDK 内置的工具不是随便选的——它是 Anthropic 内部做 Claude Code 时验证过的"完成大部分编程任务所需的最小集"：

| 工具 | 作用 | 关键设计点 |
|---|---|---|
| `Bash` | 执行 shell 命令 | 自带超时、工作目录管理、有 `run_in_background` |
| `Read` | 读文件 | **自动分页**（默认读 2000 行），支持 offset 续读 |
| `Write` | 写文件（整体覆盖） | 创建新文件，要求先 Read 过才能 Write |
| `Edit` | 精确字符串替换 | 比 Write 更安全——只改一处，不会误删 |
| `Glob` | 文件路径模式匹配 | 比 `ls` 强大，支持 `**/*.tsx` 这类递归 |
| `Grep` | 内容搜索（ripgrep 后端） | 比 `grep` 快，自动忽略 .gitignore |
| `WebFetch` | 抓网页 + LLM 处理 | 不是裸 HTTP——会过一个小模型做摘要 |

**为什么是这几个？少一个不行：**

- 没 Bash：Agent 没法跑测试、安装依赖、git 操作
- 没 Read/Write/Edit：Agent 没法改代码
- 没 Glob/Grep：Agent 没法在大代码库里定位文件
- 没 WebFetch：Agent 不能查文档

**为什么这几个就够，多了反而坏？**

Anthropic 的工程结论是：**工具越多，工具描述塞 prompt 越长，LLM 选错工具的概率越高**。一个简单的 "Find files" 工具看起来无害，但 LLM 经常会用它代替 Glob，或者反过来。最小完备集是经过反复实验得到的——再加新工具反而拉低 Agent 整体表现。

举个 Read 工具的工程细节：

```python
# 普通 SDK 实现：
def read_file(path):
    return open(path).read()
# 问题：读 50MB 的 log 文件直接爆 context

# Agent SDK 内置 Read 的设计：
def read(path, offset=0, limit=2000):
    """
    - 默认从头读 2000 行
    - 用 offset + limit 续读
    - 大文件不会一次性塞进 context
    - 用 cat -n 格式输出，LLM 能精确引用行号
    """
```

这种"在工具实现里嵌入工程经验"是 Agent SDK 的核心价值。

---

## Hooks 系统：在 Agent 行为流上挂钩子

Hooks 让你在 Agent 执行的关键时机插入自定义逻辑。和拦截器/中间件类似，但更细粒度：

| Hook 时机 | 触发条件 | 典型用途 |
|---|---|---|
| `UserPromptSubmit` | 用户提交消息后 | 改写用户输入、注入上下文 |
| `PreToolUse` | LLM 决定调用工具，但还没执行 | 阻止工具调用、修改参数、要求确认 |
| `PostToolUse` | 工具执行完成 | 改写工具输出、记录、加水印 |
| `Stop` | Agent 决定停止 | 强制继续、记录会话总结 |
| `SubagentStop` | subagent 完成 | 处理 subagent 返回结果 |

```typescript
// 例：阻止 Agent 修改 .env 文件
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{
        "type": "command",
        "command": "scripts/check-protected-files.sh"
      }]
    }]
  }
}
```

`check-protected-files.sh` 接收工具调用的 JSON，可以返回 `{"decision": "block", "reason": "..."}` 来阻止执行。

Hooks 的强大之处在于它能改变 Agent 的"行为契约"——不需要改 Agent SDK 本身，就能添加：

- **企业合规**：所有 Agent 操作都过审计日志
- **安全策略**：阻止 Agent 修改敏感文件、执行危险命令
- **效率优化**：在 PreToolUse 阶段做缓存查询，命中就跳过实际工具
- **自动测试**：PostToolUse 后自动跑 lint/typecheck
- **多 Agent 协作**：SubagentStop 后把结果分发给其他 Agent

---

## Subagents：任务委派的隔离机制

Agent SDK 的 subagent 机制让 Agent 把子任务委派出去，但有一个关键设计——**subagent 用独立的 context**：

```typescript
// 主 Agent 调用 Task 工具
{
  "name": "Task",
  "input": {
    "description": "Review auth changes",
    "subagent_type": "code-reviewer",
    "prompt": "Review the changes in src/auth/* for security issues..."
  }
}

// 内部发生的事：
// 1. SDK 启动一个新的 Agent loop
// 2. 新 loop 用独立的 system prompt（code-reviewer 角色）
// 3. 用独立的 context（看不到主对话历史）
// 4. 完成后返回一个总结消息给主 Agent
// 5. 主 Agent 看到的只是这个总结，不是 subagent 的所有中间步骤
```

为什么 subagent 不直接共享主 context？

**1. 防止主 context 污染**

主 Agent 在做一个长任务，中间需要让 subagent 做代码审查。审查过程可能产生几十个 tool call 和中间输出——如果都塞回主 context，主 Agent 的核心任务上下文就被冲淡了。

**2. 防止 prompt 注入串扰**

subagent 在审查代码时可能读到包含 prompt injection 的内容。隔离的 context 让这些恶意指令影响不到主 Agent。

**3. 并行执行**

多个 subagent 可以并行跑，每个独立 context 让并行成为可能（不需要锁主 context）。

但隔离也有代价——subagent 看不到主 Agent 的上下文，所以**必须把任务说清楚**。Agent SDK 的最佳实践里反复强调："给 subagent 的 prompt 必须自包含，不能假设它知道你刚才在聊什么"。

---

## Permission Flow：信任级别的显式管理

Agent SDK 的 permission system 把"用户对 Agent 的信任"显式建模为 4 种 mode：

| Permission Mode | 行为 | 适用场景 |
|---|---|---|
| `default` | 高危操作弹窗确认 | 日常使用 |
| `acceptEdits` | 文件编辑自动通过，其他仍确认 | 已经审过总体方向，让 Agent 跑修改 |
| `bypassPermissions` | 全部通过 | 完全信任的脚本化场景（CI/CD） |
| `plan` | 只能读、不能写 | 探索性对话，要 Agent 先制定方案 |

```typescript
const result = await query({
  prompt: "重构 src/auth 模块",
  options: {
    permissionMode: 'plan',  // 让 Agent 先出方案，不要直接改
  }
});

// 用户审过方案后切换 mode 继续
const result2 = await query({
  prompt: "执行刚才的方案",
  options: {
    permissionMode: 'acceptEdits',
    resume: result.sessionId,
  }
});
```

可以类比 OAuth 的 scope——OAuth 让用户决定第三方 app 能访问哪些数据，permission mode 让用户决定 Agent 能做哪些操作。但 permission mode 是**会话级**的，可以随时切换。

---

## 实战：用 Agent SDK 做一个代码迁移工具

```python
from claude_agent_sdk import ClaudeAgentSDK, AgentOptions
import anyio

async def migrate_codebase():
    sdk = ClaudeAgentSDK()
    
    options = AgentOptions(
        # 用 Sonnet 4.6（性价比高）
        model="claude-sonnet-4-6",
        # 系统 prompt：定义 Agent 角色
        system_prompt="""You are a code migration assistant.
        Task: migrate Python 2 syntax to Python 3 in a codebase.
        - Use Glob to find all .py files
        - Use Grep to find Python 2 patterns
        - Use Edit to make targeted changes
        - Run pytest after each batch via Bash""",
        # 允许的工具
        allowed_tools=["Glob", "Grep", "Read", "Edit", "Bash"],
        # 工作目录
        cwd="/path/to/legacy-project",
        # 自动接受编辑，但 Bash 仍需要确认
        permission_mode="acceptEdits",
        # Hooks：在每次 Edit 后自动跑 lint
        hooks={
            "PostToolUse": [{
                "matcher": "Edit",
                "hooks": [{
                    "type": "command",
                    "command": "ruff check ${file_path}"
                }]
            }]
        }
    )
    
    async for message in sdk.query(
        prompt="开始迁移整个项目",
        options=options
    ):
        # 流式打印 Agent 的每一步
        if hasattr(message, 'text'):
            print(message.text, end='', flush=True)

anyio.run(migrate_codebase)
```

这段 60 行代码相当于一个完整的代码迁移工具——如果用 Anthropic SDK 自己写，至少 500 行（要自己实现工具调用循环、hook 调用、permission 处理）。

---

## 容易踩的坑

**坑 1：以为加更多工具会让 Agent 更强**

- **现象**：在 allowed_tools 里加了几十个自定义工具，Agent 选错工具的概率变高
- **根因**：工具描述都塞 prompt 里，"选哪个"的复杂度指数级上升
- **修法**：能用内置工具就用内置（Read/Bash/Grep 几乎覆盖 90% 需求）。真要加自定义工具，少而精——并把不常用的拆到 MCP server，按需启用

**坑 2：subagent 任务描述不够清晰**

- **现象**：subagent 完成后返回的总结牛头不对马嘴
- **根因**：subagent 看不到主对话，但你给的 prompt 还在用代词（"刚才那个文件"、"这个 bug"）
- **修法**：subagent prompt 必须自包含——把文件路径、相关上下文、期望输出格式都明确写出来。把 subagent 当作完全没有上下文的同事来沟通

**坑 3：Hooks 写成阻塞操作拖慢 Agent**

- **现象**：PreToolUse hook 里调用一个慢 API，Agent 整体响应变得很慢
- **根因**：Hook 是同步执行的——hook 不返回，Agent 就卡住
- **修法**：Hook 要快（毫秒级）。慢操作放后台异步，或者在 PostToolUse 阶段（不阻塞 Agent 决策）

**坑 4：permission_mode 用 bypassPermissions 跑生产**

- **现象**：开发时 bypassPermissions 很方便，上线后 Agent 在生产服务器执行了危险命令
- **根因**：bypassPermissions 字面意思就是"全部放行"
- **修法**：生产环境永远不要用 bypassPermissions——除非是完全沙箱化的环境（Docker container、Modal 函数）。日常用 default 或 acceptEdits

---

## 与其他框架的对比

| 维度 | Claude Agent SDK | LangGraph | OpenAI Agents SDK |
|---|---|---|---|
| 模型支持 | 仅 Claude（Anthropic API） | 多 provider | 仅 OpenAI |
| 内置工具 | 多（Bash/Read/Edit/Grep/...） | 无（要自己写） | 中（WebSearch/FileSearch/Computer） |
| 编排能力 | Agent loop + Subagents | 图状态机（更强） | Handoff（轻量） |
| Hooks | 内置 5 种时机 | 无（用回调） | 有（input/output guardrails） |
| Permission | 4 种 mode | 无（要自己加） | 弱 |
| 适用场景 | 编程 Agent、Anthropic 生态 | 复杂多 Agent、需要 HITL/持久化 | OpenAI 生态简单 Agent |

**选 Claude Agent SDK 的场景**：你做的是编程类 Agent（或类似 Claude Code 的产品）、你的核心模型是 Claude、你想要 Anthropic 工程化的最佳实践开箱即用。

**不选的场景**：需要多 provider 支持、需要复杂图状态机和 HITL、想用 GPT/Gemini 而不是 Claude。

---

## 面试题深度解析

**Q1: 为什么 Anthropic 要单独做 Agent SDK，而不是让大家用 LangGraph？**

- **30 秒版本**：Agent SDK 把 Claude Code 内部的"工程最佳实践"工业化——内置工具的分页设计、permission flow 的 mode 模型、subagent 的 context 隔离策略，这些不是 LangGraph 这类通用框架能直接提供的。Anthropic 的目标是让所有人都能做出"接近 Claude Code 质量"的 Agent，最快路径就是直接发 SDK。
- **追问：这不是和 LangChain 抢市场吗？** 不完全是。LangGraph 是编排引擎（怎么连接节点），Agent SDK 是 Agent 运行时（怎么执行单个 Agent）。两者可以组合——LangGraph 的某个节点内部用 Agent SDK。但实际中大多数用户只需要其中一个。
- **追问：从战略角度，Anthropic 为什么要做这个 SDK？** 锁定生态——开发者一旦用了 Agent SDK，迁移到其他模型成本很高（hooks、permission、subagent 这些都是 Claude 特定的）。同时让 Claude 在"做编程 Agent"这个场景占据心智份额。这和 Cursor 跟 Anthropic 的深度合作是同一策略链条。

**Q2: 内置工具集为什么是这几个？设计原则是什么？**

- **30 秒版本**：最小完备集——读（Read/Glob/Grep）+ 写（Write/Edit）+ 执行（Bash）+ 检索（WebFetch）覆盖了编程任务的全部基本动作。多了会让 LLM 选错工具，少了会让 Agent 没法完成关键步骤。
- **追问：为什么没有 ListDir？用 Glob 替代它了吗？** 是的。Glob 是 ListDir 的超集——`ls dir/` 等价于 `glob "dir/*"`。但 Glob 多了递归、模式匹配。Anthropic 内部测试发现一旦有 Glob，LLM 就不再使用 ListDir。所以干脆只留 Glob。
- **追问：Edit 工具比 Write 复杂得多，为什么？** 因为 LLM 写整个文件容易出错——它可能漏掉文件的某个部分或者乱改不该改的地方。Edit 强制"精确字符串替换"——必须给出要改的旧字符串和新字符串，且旧字符串必须在文件里唯一存在。这种强约束防止 LLM 误改。Anthropic 内部数据：用 Edit 而不是 Write，错改率下降 40%。

**Q3: subagent 为什么不共享主 context？这种隔离有什么代价？**

- **30 秒版本**：三个原因——防止主 context 污染（subagent 的中间步骤不干扰主对话）、防止 prompt injection 串扰（恶意输入只影响 subagent）、支持并行执行（多个 subagent 可以并发跑）。代价是 subagent 看不到主对话，必须用自包含 prompt 给它，沟通成本变高。
- **追问：如果我想让 subagent 看到一些上下文呢？** 把需要的上下文显式塞到 subagent 的 prompt 里。这是有意的设计——强迫开发者明确"subagent 需要知道什么"，而不是默认共享一切。Anthropic 的最佳实践叫"上下文显式传递"。
- **追问：subagent 之间能通信吗？** 不能直接。Subagent 是树状结构——主 Agent 派生 subagent，subagent 还能再派生 sub-subagent。但兄弟 subagent 之间没有通信通道，必须通过共同的父 Agent 中转。这是为了保持执行图的清晰——任何复杂的多 Agent 通信都通过主 Agent 协调。

---

## 延伸阅读

- **官方文档** [docs.claude.com/en/docs/claude-code/sdk](https://docs.claude.com/en/docs/claude-code/sdk) — 重点看 Hooks、Subagents、Permissions 三章。Anthropic 的文档质量极高
- **Claude Code 内部架构** [Claude Code 源码](../source/claude-code) — Agent SDK 本质是 Claude Code 内核的开源版，理解 Claude Code 就理解了 SDK
- **MCP 协议** [MCP 详解](../tools/mcp) — Agent SDK 内置 MCP client，能连接任何 MCP server。配合使用让工具生态指数级扩张
- **Anthropic Cookbook** [github.com/anthropics/anthropic-cookbook](https://github.com/anthropics/anthropic-cookbook) — 官方示例库。`agents/` 目录下有用 Agent SDK 做各种场景的完整代码
- **Building Effective Agents** Anthropic 2024 年 12 月发的博客 — 不是教程，是 Anthropic 团队对"什么是好的 Agent 设计"的思考。理解 SDK 的设计哲学必读
