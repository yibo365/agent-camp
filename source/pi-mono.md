---
title: Pi 源码剖析
description: Pi 是 Mario Zechner（libGDX 作者）2025 年开源的"自我可扩展编程 Agent harness"（MIT，TypeScript monorepo）。本文从 agent-loop.ts 的 steering 双层循环出发，深入剖析它最值得学的几个设计：event-sourced 的会话树（对话即 git）、结构化增量式上下文压缩（compaction）、分支摘要（branch summarization）、pi-ai 的 40+ provider 统一抽象、defineTool 的 prompt 动态注入，以及 extension/skill/prompt 三层自扩展机制。
pageClass: source-pi-mono-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">Agent 源码解析</p>
  <h1>Pi 源码剖析</h1>
  <p class="doc-hero__lead">Pi（仓库 earendil-works/pi，作者 Mario Zechner，也就是 libGDX 游戏框架的作者 badlogic）是 2025 年开源的编程 Agent harness，MIT 许可、TypeScript monorepo。它不是又一个 "Claude Code 平替"，而是一个把架构做得极其干净的 <strong>"自我可扩展"（self-extensible）Agent 框架</strong>。它身上有几个别的 Agent 很少做到这个程度的东西：会话被建模成 event-sourced 的<strong>树</strong>（你可以像用 git 一样 fork、回退、切分支）、上下文压缩用的是<strong>结构化增量摘要</strong>而非简单截断、provider 层统一抽象了 40+ 家模型、工具能把自己的说明动态注入 system prompt。作者是写了十几年游戏引擎的老工程师，代码的抽象边界清晰得不像一个 2025 年的新项目——读它是学"一个 Agent 框架的理想分层"的最佳样本。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>仓库：earendil-works/pi · TypeScript · MIT · monorepo</span>
    <span>分析版本：截至 2026-06 main 分支</span>
    <span>本文覆盖：steering 循环、会话树、compaction、branch summary、provider 抽象、自扩展</span>
  </div>
</section>

> **资料来源声明**：本文基于 [earendil-works/pi](https://github.com/earendil-works/pi) 的 main 分支真实源码（已 clone 到本地分析），所有文件路径、行号、类名、函数签名都是从仓库直接读取的。Pi 是 MIT 开源、TypeScript 实现，monorepo 结构。index.md 里曾用 "pi-mono / pyMono" 指代它——其实就是这个 pi 仓库（monorepo），作者在 Hugging Face 上公开的工作 session 数据集名为 `pi-mono`。本文标注 `packages/xxx/src/yyy.ts:N` 形式的路径。

## 为什么值得读 Pi 源码

前面剖析的 Agent 各有侧重：Claude Code 是工业标准、Codex 是 Rust 性能、Cline 是 IDE 集成、SWE-agent 是学术 ACI。Pi 的独特价值是它把几个"现代 Agent 的硬骨头"用很干净的方式啃下来了，而且每一处都能直接拿来学：

```
- 一个 Agent harness 怎么分层？provider、Agent 循环、CLI/UI 该怎么解耦？
- 会话历史只能是一条线性 list 吗？Pi 把它做成树（可以 fork、回退、切分支）——怎么实现的？
- 上下文塞满了怎么办？简单截断会丢信息，Pi 怎么做"结构化增量摘要"？
- 用户在不同分支间跳来跳去，被放弃的那条分支上做的工作怎么不白费？
- 怎么用一套接口支持 40+ 家 LLM provider，还能让 Agent 循环完全不感知用的是哪家？
- "自我可扩展"是什么意思？怎么让用户用 TypeScript 给 Agent 加能力、甚至重写整个 context，而不改内核？
```

Pi 的代码质量很高，抽象边界清晰，几乎每个模块都是"一个 Agent 框架的某个子问题的参考答案"。下面逐个拆。

## 仓库总览

Pi 是 monorepo，核心是四个 package 的分层：

```
pi/
├── packages/
│   ├── ai/                         # ★ pi-ai：统一多 provider LLM API（40+ 家）
│   │   └── src/
│   │       ├── types.ts            # Api / Provider / StreamOptions 类型
│   │       ├── stream.ts           # streamSimple：统一流式入口
│   │       ├── providers/          # 各 provider 实现（anthropic/openai/google/bedrock...）
│   │       └── models.generated.ts # 自动生成的模型元数据 (16871 行)
│   ├── agent/                      # ★ pi-agent-core：通用 Agent 运行时
│   │   └── src/
│   │       ├── agent-loop.ts       # ★ Agent 主循环 (742 行)
│   │       ├── types.ts            # AgentMessage / AgentTool / AgentContext
│   │       └── harness/            # ★ harness 层
│   │           ├── agent-harness.ts        # AgentHarness 类 (1064 行)
│   │           ├── system-prompt.ts        # system prompt 组装
│   │           ├── skills.ts               # skill 加载 (375 行)
│   │           ├── compaction/
│   │           │   ├── compaction.ts       # ★ 上下文压缩 (756 行)
│   │           │   └── branch-summarization.ts  # ★ 分支摘要 (263 行)
│   │           └── session/
│   │               ├── session.ts          # ★ 会话树 (266 行)
│   │               └── jsonl-storage.ts    # JSONL 持久化 (293 行)
│   ├── coding-agent/               # ★ pi-coding-agent：编程工具 + 扩展 + CLI
│   │   └── src/
│   │       ├── core/
│   │       │   ├── tools/          # 内置工具：bash/read/write/edit/grep/find/ls
│   │       │   ├── extensions/     # ★ 扩展系统：types / runner
│   │       │   └── model-registry.ts
│   │       └── modes/
│   │           ├── interactive/    # 交互模式 (interactive-mode.ts 5624 行)
│   │           └── rpc/            # RPC 模式（供 IDE/程序调用）
│   └── tui/                        # pi-tui：终端 UI 组件库
├── .pi/                            # ★ pi 用自己开发自己（dogfooding）
│   ├── extensions/                 # TS 扩展：tps.ts（测 tok/s）、redraws.ts...
│   ├── skills/                     # Markdown skill：add-llm-provider.md
│   └── prompts/                    # Markdown slash prompt：cl.md（changelog 审计）...
└── AGENTS.md
```

**关键观察**：

**(1) 四层 package 边界清晰，单向依赖**——`pi-ai`（只管 LLM provider）→ `pi-agent`（通用 Agent 循环 + harness，不含任何具体工具）→ `pi-coding-agent`（编程工具 + 扩展 + CLI）→ `pi-tui`（纯 UI）。每层只依赖下层。最值得注意的是 **`pi-agent` 不含任何编程相关的代码**——它是通用 Agent 运行时，理论上能做任何 Agent。"编程"是 `pi-coding-agent` 这一层加上去的。这种"通用核 + 领域层"的分法，比 Cline 把所有东西塞进一个 3764 行 Task 类清爽太多。

**(2) `.pi/` 目录是 dogfooding 的证据**——pi 团队用 pi 来开发 pi。`.pi/extensions/tps.ts` 是测 tokens/秒的扩展，`.pi/skills/add-llm-provider.md` 是"怎么加一个新 provider"的 checklist，`.pi/prompts/cl.md` 是 `/cl` 这个 slash command。这个目录本身就是"自我可扩展"最直观的演示。

**(3) harness 层把"Agent 循环"和"周边能力"分开**——`agent-loop.ts` 是纯粹的 LLM↔tool 循环，而 `harness/` 下是 session 持久化、compaction、skill 加载这些"让 Agent 能长期工作"的基础设施。这个区分是 Pi 工程成熟度的体现。

## 整体架构

```
┌────────────────────────────────────────────────────────────┐
│         CLI 入口（interactive / rpc / json / print 四模式）   │
├────────────────────────────────────────────────────────────┤
│   Extension Runner（事件钩子，可改行为/工具/context/payload） │
├────────────────────────────────────────────────────────────┤
│                      AgentHarness                          │
│   ┌──────────────┬──────────────┬─────────────────────┐     │
│   │   Session    │  Compaction  │   Skills / Prompts   │     │
│   │  (事件树持久化) │  (结构化压缩)  │   (按需注入能力)       │     │
│   └──────────────┴──────────────┴─────────────────────┘     │
├────────────────────────────────────────────────────────────┤
│                  agent-loop（steering 双层循环）              │
│         AgentMessage  ──(只在边界转换)──►  LLM Message        │
├────────────────────────────────────────────────────────────┤
│              pi-ai：统一 provider 抽象（40+ 家）              │
│        anthropic / openai / google / bedrock / ...          │
│         标准化事件：text / tool_call / thinking / usage      │
└────────────────────────────────────────────────────────────┘
```

下面从下往上、从核心往外，逐层拆。

## Agent 主循环：steering 双层循环

主循环在 `packages/agent/src/agent-loop.ts:155` 的 `runLoop`。它是**外层 + 内层**的双层结构：

```typescript
// packages/agent/src/agent-loop.ts:170-266 (简化)

// 外层循环：Agent 本来要停了，但有排队的后续消息时继续
while (true) {
    let hasMoreToolCalls = true;

    // 内层循环：处理工具调用和 steering 消息
    while (hasMoreToolCalls || pendingMessages.length > 0) {
        // 1. 注入 pending 消息（用户在 Agent 干活时输入的）
        if (pendingMessages.length > 0) {
            for (const message of pendingMessages) {
                currentContext.messages.push(message);
            }
            pendingMessages = [];
        }

        // 2. 流式获取 assistant 回复
        const message = await streamAssistantResponse(currentContext, config, signal, emit, streamFn);

        if (message.stopReason === "error" || message.stopReason === "aborted") {
            await emit({ type: "agent_end", messages: newMessages });
            return;
        }

        // 3. 执行工具调用
        const toolCalls = message.content.filter((c) => c.type === "toolCall");
        if (toolCalls.length > 0) {
            const executedToolBatch = await executeToolCalls(currentContext, message, config, signal, emit);
            hasMoreToolCalls = !executedToolBatch.terminate;
            // 工具结果加入 context
        }

        // 4. 钩子：每轮结束后可以换模型/换 thinking level
        const nextTurnSnapshot = await config.prepareNextTurn?.(nextTurnContext);

        // 5. 钩子：决定是否该停
        if (await config.shouldStopAfterTurn?.({ message, toolResults, ... })) {
            return;
        }

        // 6. ★ 每轮结束后检查 steering 消息（用户插话）
        pendingMessages = (await config.getSteeringMessages?.()) || [];
    }

    // 内层退出 = Agent 想停了。检查有没有后续消息
    const followUpMessages = (await config.getFollowUpMessages?.()) || [];
    if (followUpMessages.length > 0) {
        pendingMessages = followUpMessages;
        continue;   // 回到内层继续
    }
    break;  // 真的没有更多消息了，退出
}
```

### Steering：用户在 Agent 干活时插话

这是 Pi 一个很贴心的交互设计。`getSteeringMessages`（每轮结束后调用）让用户能在 Agent 还在运行时输入消息——这些消息会在下一轮 LLM 调用前被注入 context。

想象场景：Agent 正在改一堆文件，你看到它方向有点偏，不用打断/重启，直接打字"等等，先别动 test 文件"。这条消息作为 steering message 在下一轮被注入，Agent 当场就能调整。这比"必须等 Agent 停下来才能说话"流畅得多。

注意它是**软引导**——steering 消息在"每轮结束后"注入（turn 末尾调 `getSteeringMessages`），不会硬打断正在进行的 LLM 流。这是有意的：硬打断一个流到一半的 LLM 响应会破坏 context 一致性。要真正硬停，用 `AbortSignal`。

`getFollowUpMessages`（外层循环用）处理另一种情况：Agent 已经完成当前任务想停，但用户队列里还有下一个任务，就继续而不是退出。两个钩子分工清晰：**steering 是"运行中插话"，follow-up 是"完成后追加"**。

### AgentMessage 与 LLM Message 的分层

文件开头的注释（`agent-loop.ts:1-4`）点出一个重要设计：

```typescript
/**
 * Agent loop that works with AgentMessage throughout.
 * Transforms to Message[] only at the LLM call boundary.
 */
```

Pi 内部一直用 `AgentMessage`（自己的富消息类型），**只在真正调 LLM 时才用 `convertToLlm` 转换成 provider 要的 `Message[]`**。

为什么？因为 Agent 内部要管理的信息比 LLM 看到的多得多。看 Pi 的消息角色（`compaction.ts:223-257` 的 `estimateTokens` 里能看到全部）：除了标准的 `user`/`assistant`/`toolResult`，还有 `bashExecution`（用户手动跑的 bash）、`custom`（扩展注入的自定义消息）、`branchSummary`（分支摘要）、`compactionSummary`（压缩摘要）。这些是 Pi 自己的概念，LLM 不需要原样看到。把"Agent 的消息模型"和"LLM 的消息模型"分两层，转换只发生在边界——内部逻辑不被任何 provider 的消息格式绑架，多 provider 支持也因此变得容易。

## 会话树：把对话做成 git（Pi 最值得学的设计）

大多数 Agent 的会话历史是一条**线性 list**——消息一条接一条往后追加。Pi 不是。它把会话建模成一棵 **event-sourced 的树**，这是它最有意思、也最容易被忽略的设计。

### 一切皆 append-only entry

看 `Session` 类（`packages/agent/src/harness/session/session.ts:82`）。会话里的每一个状态变化都是一个 **entry**，每个 entry 有自己的 `id` 和指向父节点的 `parentId`：

```typescript
// packages/agent/src/harness/session/session.ts:132-140

async appendMessage(message: AgentMessage): Promise<string> {
    return this.appendTypedEntry({
        type: "message",
        id: await this.storage.createEntryId(),
        parentId: await this.storage.getLeafId(),   // ★ 指向当前叶子
        timestamp: new Date().toISOString(),
        message,
    } satisfies MessageEntry);
}
```

不只消息是 entry——**模型切换、thinking level 调整、激活工具变化、压缩、标签、会话改名，全都是 entry**：

| entry 类型 | 记录什么 |
|---|---|
| `message` | 一条对话消息 |
| `model_change` | 用户中途换了模型 |
| `thinking_level_change` | 调整了思考强度 |
| `active_tools_change` | 启用/禁用了某些工具 |
| `compaction` | 一次上下文压缩（含摘要 + 保留起点） |
| `branch_summary` | 一条放弃分支的摘要 |
| `custom_message` | 扩展注入的自定义消息 |
| `label` | 给某个 entry 打标签 |
| `session_info` | 会话名等元信息 |

每个 entry 都带 `parentId`，所有 entry 连起来就是一棵树。当前所在的位置叫 `leafId`（叶子）。这是典型的 **event sourcing**——不存"当前状态"，存"所有发生过的事件"，状态由重放事件得出。

### getBranch：从叶子走到根

"当前的对话历史"是什么？就是从当前叶子沿着 `parentId` 一路走到根的那条路径（`session.ts:109-112`）：

```typescript
async getBranch(fromId?: string): Promise<SessionTreeEntry[]> {
    const leafId = fromId ?? (await this.storage.getLeafId());
    return this.storage.getPathToRoot(leafId);   // 沿 parentId 走到根
}
```

### buildSessionContext：重放路径还原状态

拿到这条路径后，`buildSessionContext`（`session.ts:22-80`）重放它，还原出真正要发给 LLM 的状态：

```typescript
// packages/agent/src/harness/session/session.ts:22-79 (简化)

export function buildSessionContext(pathEntries: SessionTreeEntry[]): SessionContext {
    let thinkingLevel = "off";
    let model = null;
    let activeToolNames = null;
    let compaction = null;

    // 扫一遍路径，派生出当前的 model/thinking/tools 等状态
    for (const entry of pathEntries) {
        if (entry.type === "model_change") model = { ... };
        else if (entry.type === "thinking_level_change") thinkingLevel = entry.thinkingLevel;
        else if (entry.type === "active_tools_change") activeToolNames = [...];
        else if (entry.type === "compaction") compaction = entry;
        // assistant 消息也会更新 model（记录实际用的模型）
    }

    // 收集消息。如果路径上有 compaction，只保留摘要 + firstKeptEntryId 之后的消息
    const messages = [];
    if (compaction) {
        messages.push(createCompactionSummaryMessage(compaction.summary, ...));
        // 跳过被压缩的部分，只 append firstKeptEntryId 之后的 entry
    } else {
        for (const entry of pathEntries) appendMessage(entry);
    }
    return { messages, thinkingLevel, model, activeToolNames };
}
```

注意它怎么处理 compaction：路径里如果有压缩 entry，就用压缩摘要替换掉被压缩的那段历史，只保留 `firstKeptEntryId` 之后的新消息。**压缩不是删除——被压缩的 entry 还在树里，只是重放时被摘要替代**。这意味着你随时可以回到压缩前的状态。

### moveTo：切分支 + 给放弃的分支留摘要

真正体现"树"价值的是 `moveTo`（`session.ts:246-265`）——导航到树上另一个 entry（切分支）：

```typescript
async moveTo(entryId, summary?): Promise<string | undefined> {
    await this.storage.setLeafId(entryId);   // 把叶子移到目标位置
    if (!summary) return undefined;
    // ★ 可选：给被放弃的那条分支写一条摘要
    return this.appendTypedEntry({
        type: "branch_summary",
        fromId: entryId ?? "root",
        summary: summary.summary,
        ...
    });
}
```

这个树模型带来的能力，本质上就是 **git for conversations**：

- **回退**：把 `leafId` 移到历史上某个 entry，就回到了那个时刻的状态
- **fork**：从某个 entry 出发往不同方向继续，自然形成分叉
- **重试**：模型这一轮答得不好？回退到上一个 user 消息，重新生成——旧的回答还在另一条分支上
- **不丢工作**：切换分支时可以给放弃的分支写摘要（下一节细讲），探索的成果不白费

对比一下：Cline/Claude Code 的会话基本是线性的，"重试"靠截断 list。Pi 的树模型让"探索-回退-换个方向"成为一等公民。这对真实的编程工作流很有用——你经常要试一个方向，不行就退回来换个思路。

## 上下文压缩：结构化增量摘要

上下文窗口塞满了怎么办？最朴素的做法是滑动窗口（丢掉最老的消息），但那样会丢失早期的关键决策。Pi 的 compaction（`packages/agent/src/harness/compaction/compaction.ts`，756 行）做得精细很多。

### 何时压缩

`shouldCompact`（`compaction.ts:196-199`）的判断很简单：

```typescript
export function shouldCompact(contextTokens, contextWindow, settings): boolean {
    if (!settings.enabled) return false;
    return contextTokens > contextWindow - settings.reserveTokens;  // 留出 reserve 空间
}
```

默认 `reserveTokens: 16384`（给摘要的 prompt 和输出留空间）、`keepRecentTokens: 20000`（压缩后保留约这么多最近上下文）（`compaction.ts:112-116`）。

token 估算（`estimateContextTokens`，`compaction.ts:165`）有个聪明处理：**优先用 provider 真实回报的 usage，没有才用字符数 ÷ 4 的启发式**。因为 LLM API 返回的 usage 是准的，但只覆盖到最后一条 assistant 消息——它之后的新消息（工具结果等）没有 usage，就用启发式估。两者相加得到当前总量。

### 在哪切：保护工具调用对和 turn 边界

压缩要选一个"切点"——切点之前的历史被摘要替代，之后的保留。但不能乱切。`findValidCutPoints`（`compaction.ts:261-299`）有个关键约束：**`toolResult` 不能作为切点**。

```typescript
case "toolResult":
    break;   // ★ 工具结果不能当切点
```

为什么？因为 tool call 和它的 tool result 必须成对出现——如果切点落在它们中间，就会出现"有 tool result 但没有对应的 tool call"的非法状态，LLM provider 会直接报错。所以切点只能落在完整的消息边界上。

`findCutPoint`（`compaction.ts:329`）从后往前累加 token，直到攒够 `keepRecentTokens`，然后找一个合法切点；如果切点落在一个 turn 中间（assistant 还在干活），还会回溯到 turn 的起点（`findTurnStartIndex`），避免把一个正在进行的回合劈成两半。

### 摘要长什么样：结构化 checkpoint

最值得学的是摘要的格式。它不是"用一段话概括对话"，而是一个**结构化的 checkpoint**（`compaction.ts:383-414` 的 `SUMMARIZATION_PROMPT`）：

```
## Goal
[用户想完成什么]

## Constraints & Preferences
- [用户提到的约束、偏好、要求]

## Progress
### Done
- [x] [已完成的任务/改动]
### In Progress
- [ ] [当前在做的]
### Blocked
- [卡住的问题]

## Key Decisions
- **[决策]**: [简短理由]

## Next Steps
1. [接下来该做什么，有序列表]

## Critical Context
- [继续工作需要的数据、示例、引用]
```

prompt 末尾特别强调：`Preserve exact file paths, function names, and error messages`（保留精确的文件路径、函数名、错误信息）。这是针对编程任务调的——摘要里如果把 `src/config.ts:42` 概括成"配置文件"，后续就没法精确操作了。

### 增量更新：不重新摘要全部

更精妙的是 Pi 用**增量摘要**而不是每次从头总结。如果已经有一个摘要，再次压缩时用 `UPDATE_SUMMARIZATION_PROMPT`（`compaction.ts:416-453`）：

```
The messages above are NEW conversation messages to incorporate into the
existing summary provided in <previous-summary> tags.

RULES:
- PRESERVE all existing information from the previous summary
- ADD new progress, decisions, and context from the new messages
- UPDATE the Progress section: move items from "In Progress" to "Done"
  when completed
- PRESERVE exact file paths, function names, and error messages
```

它把上一次的摘要塞进 `<previous-summary>` 标签，让模型在它基础上**增量更新**——把"In Progress"挪到"Done"、补充新决策、更新"Next Steps"。这比每次重新摘要整段历史省 token，也更不容易在反复摘要中丢失早期信息（反复有损压缩会越压越糊，增量更新保留了结构）。

### 跨压缩追踪文件操作

还有个工程细节：压缩会**追踪整个被压缩历史里读过/改过哪些文件**（`compaction.ts:36-59` 的 `extractFileOperations`），并把这个列表存进压缩 entry 的 details，下次压缩时继承。这样即使一段对话被压缩成了几行摘要，"这个 session 碰过哪些文件"的信息不会丢——对编程 Agent 维持对代码库的认知很关键。

## 分支摘要：放弃的分支不白费

会话树 + 压缩之外，Pi 还有一个独立但相关的机制：**branch summarization**（`packages/agent/src/harness/compaction/branch-summarization.ts`）。

当你从一条分支切到另一条分支（`moveTo`），之前那条分支上做的探索怎么办？直接丢掉太可惜（你可能在那条分支上读了一堆代码、试了几个方案）。Pi 的做法是：切换前，把要放弃的那段分支摘要成一条 `branch_summary`，带到新分支上。

关键是怎么确定"要放弃的是哪一段"。`collectEntriesForBranchSummary`（`branch-summarization.ts:69-90`）用了一个**和 git merge-base 完全一样的算法**——找两条分支的**最近公共祖先**：

```typescript
// packages/agent/src/harness/compaction/branch-summarization.ts:69-90 (简化)

export async function collectEntriesForBranchSummary(session, oldLeafId, targetId) {
    if (!oldLeafId) return { entries: [], commonAncestorId: null };

    const oldPath = new Set((await session.getBranch(oldLeafId)).map((e) => e.id));
    const targetPath = await session.getBranch(targetId);

    // 从目标路径往根走，第一个出现在旧路径里的就是最近公共祖先
    let commonAncestorId = null;
    for (let i = targetPath.length - 1; i >= 0; i--) {
        if (oldPath.has(targetPath[i].id)) {
            commonAncestorId = targetPath[i].id;
            break;
        }
    }

    // 收集"旧叶子 → 公共祖先"之间的 entry（这就是要被放弃、需要摘要的部分）
    const entries = [];
    let current = oldLeafId;
    while (current && current !== commonAncestorId) {
        const entry = await session.getEntry(current);
        // ... 收集
    }
    return { entries, commonAncestorId };
}
```

找到公共祖先后，"旧叶子 → 公共祖先"之间的 entry 就是这次切换要放弃的部分，把它们摘要成一条 `branch_summary` 带到新分支。**这是把 git 的分支模型完整搬到了对话上**——不只是数据结构像树，连"切换分支时怎么处理两条分支的差异"都借鉴了 git 的 merge-base 思路。

## pi-ai：40+ provider 的统一抽象

`packages/ai` 是 Pi 的底座，把所有 LLM provider 统一成一套接口。看它支持的范围（`packages/ai/src/types.ts:23-58` 的 `KnownProvider`）：anthropic、openai、google、google-vertex、amazon-bedrock、azure、deepseek、xai、groq、cerebras、openrouter、mistral、moonshot（kimi）、minimax、fireworks、together、github-copilot……40 多家。

支撑这么多 provider 的关键是两层抽象：

**(1) API 类型归类**（`types.ts:6-15` 的 `KnownApi`）：虽然 provider 有 40 家，但底层 API 协议就那么几种——`openai-completions`、`openai-responses`、`anthropic-messages`、`bedrock-converse-stream`、`google-generative-ai` 等。很多 provider 共用同一种 API 协议（比如一堆国产模型都兼容 openai-completions），所以真正要实现的 provider 文件没有 40 个那么多。

**(2) 标准化流式事件**：不管底层是 OpenAI 的 SSE 还是 Anthropic 的 stream，所有 provider 都把响应归一成同一套事件。从 skill 文档 `.pi/skills/add-llm-provider.md` 能看到要求：

```
Response parsing that emits standardized events
(text, tool_call, thinking, usage, stop).
```

上层 Agent 循环通过 `streamSimple`（`packages/ai/src/stream.ts:58`）拿到的永远是这套统一事件——它完全不知道、也不需要知道用的是哪家模型。`StreamOptions`（`types.ts:87`）里还统一抽象了 `transport`（sse / websocket / websocket-cached / auto）、`cacheRetention`（prompt 缓存保留策略）、`sessionId`（session 级缓存）这些跨 provider 的概念。

这种"把 provider 差异隔离在最底层"的设计，是 Pi 能轻松支持多模型、而上层逻辑保持干净的根本原因。

## defineTool：工具自带 prompt 注入

Pi 的工具定义有个聪明设计。`ToolDefinition` 接口（`packages/coding-agent/src/core/extensions/types.ts:433`）里，工具不只定义"怎么执行"，还能定义"怎么向 system prompt 介绍自己"：

```typescript
// packages/coding-agent/src/core/extensions/types.ts:433-468 (简化)

export interface ToolDefinition<TParams, TDetails, TState> {
    name: string;
    label: string;
    description: string;       // 给 LLM 的工具描述（function calling 用）

    // ★ 注入到默认 system prompt "Available tools" 段落的一行简介
    promptSnippet?: string;
    // ★ 当这个工具激活时，追加到 system prompt "Guidelines" 段落的指引
    promptGuidelines?: string[];

    parameters: TParams;       // TypeBox schema
    executionMode?: "sequential" | "parallel";  // 每个工具可单独声明能否并行

    execute(toolCallId, params, signal, onUpdate, ctx): Promise<AgentToolResult<TDetails>>;

    // 自定义 UI 渲染（Pi 是框架，把渲染控制权交给工具）
    renderCall?: (args, theme, context) => Component;
    renderResult?: (result, options, theme, context) => Component;
}
```

`promptSnippet` 和 `promptGuidelines` 是关键——**工具自己携带它在 system prompt 里的说明**。当一个工具被激活，它的 snippet 注入 system prompt 的工具列表，guidelines 注入指引段落。

这解决了"system prompt 怎么随工具集动态变化"的问题。传统做法是写死一个列出所有工具的巨型 system prompt，加/减工具要手动改 prompt。Pi 让每个工具自带说明，system prompt 根据当前激活的工具动态组装——加工具自动进 prompt、禁用自动移除。这是"可扩展"在 prompt 层面的体现。

`executionMode` 也值得注意：每个工具单独声明能否并行（类似 Codex 的 `supports_parallel_tool_calls`）。`renderCall`/`renderResult` 让工具自定义在 TUI 里的显示——这是 Pi 作为"框架"而非"产品"的体现：它把渲染控制权交给工具。

### edit 工具：和 Claude Code 同路线

看内置 edit 工具（`packages/coding-agent/src/core/tools/edit.ts:35-54`），它走的是和 Claude Code Edit 一样的 `oldText → newText` 精确替换路线：

```typescript
const replaceEditSchema = Type.Object({
    oldText: Type.String({
        description: "Exact text for one targeted replacement. It must be unique in the original file...",
    }),
    newText: Type.String({ description: "Replacement text for this targeted edit." }),
});

const editSchema = Type.Object({
    path: Type.String(...),
    edits: Type.Array(replaceEditSchema, {  // ★ 一次调用可以做多个替换
        description: "One or more targeted replacements. Each edit is matched against the original file, not incrementally...",
    }),
});
```

`oldText` 必须在文件里唯一——和 Claude Code 的 Edit 约束一致。但 Pi 支持一次传**多个 edit**（`edits` 数组），并明确要求"每个 edit 是对原始文件匹配，不是增量的""不要有重叠或嵌套的 edit"。文件写入还经过 `file-mutation-queue`（并发安全）和行尾处理（`edit-diff.ts` 里有 `normalizeToLF`/`restoreLineEndings`/`stripBom`——统一成 LF 处理、改完恢复原始行尾、处理 BOM）。这些是把"让 LLM 精确改文件"做稳的工程细节。

## 三种自扩展机制：extension / skill / prompt

"自我可扩展"具体是三层机制，对应 `.pi/` 下三个目录。从重到轻：

### 1. Extension（TypeScript）：挂载到事件循环

扩展是 TS 文件，导出一个接收 `ExtensionAPI` 的函数，通过 `pi.on(event, handler)` 挂载到 Agent 的生命周期。看 `.pi/extensions/tps.ts`（测算 tokens/秒）：

```typescript
// .pi/extensions/tps.ts (简化)

export default function (pi: ExtensionAPI) {
    let agentStartMs: number | null = null;

    pi.on("agent_start", () => { agentStartMs = Date.now(); });

    pi.on("agent_end", (event, ctx) => {
        if (!ctx.hasUI) return;   // ★ 兼容 headless 模式
        const elapsedMs = Date.now() - agentStartMs!;
        let output = 0;
        for (const message of event.messages) {
            if (isAssistantMessage(message)) output += message.usage.output || 0;
        }
        const tokensPerSecond = output / (elapsedMs / 1000);
        ctx.ui.notify(`TPS ${tokensPerSecond.toFixed(1)} tok/s ...`, "info");
    });
}
```

但扩展的能力远不止监听事件。看 `ExtensionRunner`（`packages/coding-agent/src/core/extensions/runner.ts`）暴露的钩子，有些**能改 Agent 的核心数据流**：

| 钩子 | 能力 |
|---|---|
| `emitMessageEnd` | 拦截并**替换**一条消息 |
| `emitToolCall` | 拦截工具调用 |
| `emitToolResult` | 修改工具结果 |
| `emitContext` | **重写整个发给 LLM 的消息列表** |
| `emitBeforeProviderRequest` | 检查/替换**发给 provider 的原始 payload** |
| `fork` / `navigateTree` / `switchSession` | 操作会话树 |

`emitContext` 和 `emitBeforeProviderRequest` 是真正的深度扩展——前者让扩展能在请求发出前重写全部 context（比如注入额外信息、过滤敏感内容），后者让扩展能直接操作发给 provider 的原始请求体。这意味着用户不用 fork 内核，就能改 Agent 几乎任何行为。这才是 "self-extensible" 的分量所在。

### 2. Skill（Markdown）：渐进式披露的知识

Skill 是带 frontmatter 的 Markdown（`loadSkills`，`skills.ts:48`），从 `SKILL.md` 文件和根目录的 `.md` 文件加载。看 `.pi/skills/add-llm-provider.md`：

```markdown
---
name: add-llm-provider
description: Checklist for adding a new LLM provider to packages/ai...
---
# Adding a New LLM Provider (packages/ai)
## 1. Core Types (packages/ai/src/types.ts)
- Add API identifier to Api type union...
```

关键在 system prompt 怎么用它。`formatSkillsForSystemPrompt`（`system-prompt.ts:3-25`）**只把 name/description/location 注入 prompt，不注入完整内容**：

```typescript
// packages/agent/src/harness/system-prompt.ts (简化)
"The following skills provide specialized instructions for specific tasks.",
"Read the full skill file when the task matches its description.",
// 然后每个 skill 只列 <name>/<description>/<location>
```

这是**渐进式披露（progressive disclosure）**——system prompt 里只放一个"目录"（这个 skill 叫什么、是干嘛的、在哪），模型判断当前任务匹配某个 skill 时，才用文件工具去读完整内容。和 Claude Code 的 skill 机制完全一致。好处是：哪怕你有 50 个 skill，system prompt 也只多了 50 行目录，不会被 50 篇完整文档撑爆。skill 是"按需加载的程序性知识"。

### 3. Prompt（Markdown）：slash command

Prompt 是带 frontmatter 的 Markdown，相当于自定义 slash command。看 `.pi/prompts/cl.md`：

```markdown
---
description: Audit changelog entries before release
---
Audit changelog entries for all commits since the last release.
## Process
1. Find the last release tag: `git tag --sort=-version:refname | head -1`
2. List all commits since that tag: ...
```

用户输入 `/cl` 就触发这个预置 prompt 模板（`formatPromptTemplateInvocation`）。这是把常用的复杂指令固化成快捷命令——和 Claude Code 的自定义 slash command 一样。

**三者分工**：extension 改行为（TS，最强，能重写 context/payload）、skill 加知识（Markdown，渐进式按需加载）、prompt 加快捷指令（Markdown，触发式）。从重到轻覆盖不同粒度的扩展需求。

## 与其他 Agent 的对比

| 维度 | Pi | Claude Code | Cline |
|---|---|---|---|
| 架构 | 四层 monorepo，单向依赖 | TypeScript 单包 SDK | 一个 3764 行 Task 类 |
| 通用核 | pi-agent 与编程解耦，可做任何 Agent | 偏编程 | 偏编程 |
| 会话模型 | **event-sourced 树**（可 fork/回退/切分支） | 线性 | 线性 |
| 上下文压缩 | 结构化增量摘要 + 文件追踪 | 自动压缩 | summarize/condense |
| 分支处理 | branch summary（merge-base 算法） | 无 | 无 |
| provider | 统一抽象 40+ 家 | Anthropic | 多 provider |
| 工具调用 | function calling + executionMode | function calling | XML 标签 |
| prompt 组装 | 工具自带 promptSnippet 动态注入 | 相对固定 | 模式化 |
| 扩展机制 | extension(TS) + skill + prompt 三层 | Hooks + MCP + skill | MCP |
| 消息模型 | AgentMessage / LLM Message 分层 | ContentBlock | ClineMessage |

Pi 最大的差异化是**会话树 + 干净分层 + 深度可扩展**。它不追求 Claude Code 那种"开箱即用的工业标准"，而是给你一个抽象边界清晰、可以随意改造的内核。如果你要基于一个开源框架做自己的 Agent，Pi 的分层比把所有东西塞进一个大类的项目好改太多。

## 容易踩的坑

**1. steering 消息不是实时打断**

- **现象**：用户插话了，但 Agent 没立即响应，而是等当前这轮 LLM 调用和工具执行完才处理
- **根因**：steering 消息在"每轮结束后"注入（`getSteeringMessages` 在 turn 末尾调用），不是实时打断当前 LLM 流
- **修法**：这是有意设计——硬打断正在进行的 LLM 流会破坏 context 一致性（出现不完整的消息）。要真正硬停，用 `AbortSignal`；steering 是"软引导"，下一轮才生效

**2. 压缩切点落在工具调用对中间**

- **现象**：自己实现压缩逻辑时，provider 报错"tool_use 没有对应的 tool_result"或反之
- **根因**：tool call 和 tool result 必须成对，切点落在它们之间会产生非法状态
- **修法**：Pi 的 `findValidCutPoints` 把 `toolResult` 排除在合法切点之外，并用 `findTurnStartIndex` 把切点对齐到 turn 边界。自己做压缩一定要保护这种成对结构

**3. 扩展假设有 UI，headless 模式崩溃**

- **现象**：扩展在 rpc/json/print 模式下报错或行为异常
- **根因**：扩展用了 `ctx.ui.notify` 等 UI API，但 Pi 支持 tui/rpc/json/print 四种模式，headless 下没有 UI
- **修法**：tps.ts 的写法值得学——开头先 `if (!ctx.hasUI) return;`。扩展要兼容多模式就得检查 `ctx.hasUI`

**4. 工具 executionMode 选错导致竞态**

- **现象**：两个工具并行执行，结果互相干扰（比如都改同一个文件）
- **根因**：可并行的工具默认会并发，但有共享副作用的工具（写文件）并行会有竞态
- **修法**：有副作用的工具显式声明 `executionMode: "sequential"`。Pi 的 edit 工具还额外加了 `file-mutation-queue` 兜底。这和 Codex 的 RwLock 读写锁是同类问题——区分可并行的只读工具和必须串行的写工具

## 面试题深度解析

**Q1: 一个 Agent harness 应该怎么分层？以 Pi 为例。**

- **30 秒版本**：Pi 分四层——pi-ai（provider 抽象，把 40+ 家 LLM 归一成标准事件）、pi-agent（**通用** Agent 循环 + harness，不含任何具体工具）、pi-coding-agent（编程工具 + 扩展 + CLI）、pi-tui（纯 UI）。每层只依赖下层。最关键的是 pi-agent 与"编程"解耦——它是通用 Agent 运行时，换掉上层就能做非编程 Agent。
- **追问：和 Cline 的单一大类对比？** Cline 把所有东西塞进一个 3764 行 Task 类，好处是逻辑集中好找，坏处是难复用、难测试、改一处牵连全身。Pi 的分层利于扩展和复用，代价是跨层调试要在多文件间跳。这是"内聚 vs 解耦"的经典权衡，框架型项目更倾向解耦。
- **追问：为什么把消息分成 AgentMessage 和 LLM Message 两层？** 因为 Agent 内部要管理的信息（bashExecution、custom、branchSummary、compactionSummary、UI 渲染、session 分支）比 LLM 需要的多。两层分离，转换只在调 LLM 的边界发生，内部逻辑不被 provider 消息格式绑架，多 provider 支持也更容易。

**Q2: 会话历史为什么要做成树而不是线性 list？Pi 怎么实现的？**

- **30 秒版本**：树支持 fork、回退、切分支——这些在真实编程工作流里很常见（试一个方向不行就退回来换思路）。Pi 用 event sourcing 实现：每个状态变化（消息、换模型、压缩等）都是带 `parentId` 的 append-only entry，所有 entry 构成树，`leafId` 标记当前位置。"当前对话"就是从叶子沿 parentId 走到根的路径，重放这条路径还原状态。
- **追问：压缩怎么和树共存？** 压缩不删除 entry——被压缩的 entry 还在树里，只是 `buildSessionContext` 重放时用压缩摘要替代 `firstKeptEntryId` 之前的部分。所以你随时能回到压缩前的状态。这是 event sourcing 的天然好处：存事件不存状态，状态随时可重建。
- **追问：切分支时放弃的工作怎么办？** Pi 有 branch summarization——切换前用和 git merge-base 一样的算法找两条分支的最近公共祖先，把"旧叶子→公共祖先"之间的 entry 摘要成一条 branch_summary 带到新分支。探索的成果不白费。本质是把 git 的分支模型完整搬到了对话上。

**Q3: 上下文压缩怎么做才不丢关键信息？**

- **30 秒版本**：三个要点。①切点要合法——不能切在 tool call 和 tool result 中间（会产生非法状态），要对齐 turn 边界。②摘要要结构化——Pi 用固定模板（Goal/Constraints/Progress[Done/InProgress/Blocked]/Key Decisions/Next Steps/Critical Context），强制保留精确的文件路径、函数名、错误信息。③增量更新——已有摘要时把它塞进 previous-summary，让模型在其上增量更新，而不是每次从头总结。
- **追问：为什么增量更新比每次重新摘要好？** 省 token（不用每次重摘整段历史），更重要的是不容易在反复有损压缩中越压越糊——增量更新保留了上次摘要的结构和早期信息。还有个细节：Pi 跨压缩追踪读过/改过的文件列表，即使对话被压成几行，"碰过哪些文件"也不丢。
- **追问：token 怎么估准？** 优先用 provider 真实回报的 usage（准），它只覆盖到最后一条 assistant 消息；之后的新消息没有 usage，用字符数÷4 的启发式估，两者相加。比纯启发式准得多。

**Q4: "自我可扩展"具体怎么实现？扩展能改到多深？**

- **30 秒版本**：三层机制。extension（TypeScript，挂载到事件循环，最强）、skill（Markdown，渐进式按需加载的知识）、prompt（Markdown，slash command）。从重到轻。
- **追问：extension 能改到多深？** 很深。除了监听生命周期事件，它能通过 `emitContext` 重写整个发给 LLM 的消息列表、通过 `emitBeforeProviderRequest` 替换发给 provider 的原始 payload、通过 `emitToolResult` 改工具结果、还能操作会话树（fork/navigate）。用户不用 fork 内核就能改几乎任何行为——这才是 self-extensible 的分量。
- **追问：skill 的渐进式披露是什么？** system prompt 里只放 skill 的 name/description/location（一个目录），不放完整内容。模型判断任务匹配某 skill 时，才用文件工具读完整内容。好处是哪怕有 50 个 skill，prompt 也只多 50 行目录，不被完整文档撑爆。和 Claude Code skill 一致。

## 延伸阅读

- **[earendil-works/pi](https://github.com/earendil-works/pi)** — 仓库本身。最值得精读三个文件：`packages/agent/src/harness/session/session.ts`（会话树）、`compaction/compaction.ts`（结构化压缩）、`compaction/branch-summarization.ts`（merge-base 分支摘要）。这三处是 Pi 信息密度最高、最有原创性的地方
- **[.pi/ 目录](https://github.com/earendil-works/pi/tree/main/.pi)** — pi 用自己开发自己的现场。`extensions/tps.ts` 是扩展的最小可用示例，`skills/add-llm-provider.md` 演示 skill 怎么写，对照官方文档读能快速上手自扩展
- **[pi.dev](https://pi.dev)** — 项目官网与文档，有 demo。README 里说"你也可以直接让 agent 解释它自己"——这本身就体现 self-extensible 的理念
- **[badlogicgames/pi-mono on Hugging Face](https://huggingface.co/datasets/badlogicgames/pi-mono)** — 作者公开的真实工作 session 数据集。想看一个 Agent 在真实任务里怎么用工具、怎么失败、怎么纠错、会话树长什么样，这是难得的真实数据
- **[Claude Code 源码剖析](./claude-code)** — 扩展机制和 skill 渐进式披露的对照。Pi 的 extension/skill/prompt 三层和 Claude Code 的 Hooks/MCP/skill 解决同类问题，对比能理解"in-process 扩展"和"进程边界扩展"的取舍
- **[Codex CLI 源码剖析](./codex-cli)** — 工具并发和 provider 抽象的对照。Pi 的 `executionMode` 和 Codex 的 RwLock 是同一问题的两种解法；两者都用 OpenAI Responses API，pi-ai 的 provider 抽象层值得和 Codex 的 codex-api 对比
- **[Aider 源码剖析](./aider)** — 上下文管理的对照。Aider 用 RepoMap 压缩代码库上下文，Pi 用结构化摘要压缩对话上下文——两种"省 context"的思路，针对的是不同维度的信息
