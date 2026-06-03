---
title: Codex CLI 源码剖析
description: OpenAI 的 Codex CLI 是 2025 年开源的编程 Agent（Apache 2.0），核心已从 TypeScript 重写为 100+ 个 Rust crate 的工作区。本文从 codex-rs 的 turn.rs 主循环出发，逐层拆解 Responses API 调用、apply_patch 模糊匹配编辑、OS 级沙箱（Seatbelt/seccomp/Landlock）、ToolExecutor trait 的并发模型，并与 Claude Code 做架构对比。
pageClass: source-codex-cli-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">Agent 源码解析</p>
  <h1>Codex CLI 源码剖析</h1>
  <p class="doc-hero__lead">Codex CLI 是 OpenAI 2025 年初开源的编程 Agent，Apache 2.0 许可证，与 Claude Code 直接竞争。它最初是 TypeScript 实现，后来被完全重写为 Rust——一个包含 100+ 个 crate 的 workspace，把 OS 级沙箱、自定义 patch 格式、WebSocket 传输这些在 Node.js 里很难做好的事情用 Rust 原生实现了。读 Codex CLI 源码的核心价值不在于"又一个 Coding Agent"，而在于它和 Claude Code 在几个关键设计点上走了完全不同的路——同一个问题域里的两套解法对比，比单看一个更有启发。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>仓库：openai/codex · Rust + TypeScript · 30k+ star</span>
    <span>分析版本：截至 2026-06 main 分支</span>
    <span>本文覆盖：Agent 主循环、apply_patch、OS 沙箱、工具并发、Responses API</span>
  </div>
</section>

> **资料来源声明**：本文基于 [openai/codex](https://github.com/openai/codex) 的 main 分支真实源码（已 clone 到本地分析），所有文件路径、行号、结构体名、函数签名都是从仓库直接读取的。Codex CLI 是 Apache 2.0 开源，Rust 代码组织清晰——本文展示的代码摘录都来自真实文件，标注 `codex-rs/xxx/src/yyy.rs:N` 形式的路径。

## 为什么值得读 Codex CLI 源码

Claude Code 和 Codex CLI 是 2025 年两大巨头编程 Agent 的直接对决。读 Codex 源码的价值在于它提供了同一组工程问题的另一套答案：

```
- Claude Code 用 exact string match 改文件（Edit 工具的 old_string → new_string），Codex 用自定义 patch 格式 + 模糊匹配——哪种更不容易失败？
- Claude Code 靠权限弹窗管安全，Codex 直接用 OS 级沙箱（macOS Seatbelt、Linux Landlock）——哪种更安全？代价是什么？
- Claude Code 是 TypeScript 单包，Codex 从 TS 重写到 100+ 个 Rust crate——这值吗？
- Claude Code 用 Anthropic Messages API，Codex 用 OpenAI Responses API——API 设计差异怎么影响 Agent 循环实现？
- Codex 的工具并发用 RwLock 精细控制，Claude Code 工具默认串行——各自的 trade-off 是什么？
```

更实用的角度：如果你在面试中被问"Coding Agent 的文件编辑怎么实现"或"Agent 的安全模型怎么设计"，能把两套方案对比着说，比只了解一个高出一个档次。

## 仓库总览

```
codex/                              # 仓库根目录
├── codex-cli/                       # 原始 TS CLI（已弃用，保留为 legacy）
│   ├── bin/
│   └── scripts/
├── codex-rs/                        # ★ Rust 重写——当前主实现
│   ├── core/                        # ★ Agent 内核：Session / Turn 主循环 (2247 行 turn.rs)
│   │   └── src/
│   │       ├── session/turn.rs      # 主循环入口 run_turn()
│   │       └── tools/handlers/     # 工具实现（shell、apply_patch、multi_agents...）
│   ├── apply-patch/                 # ★ 文件编辑：自定义 patch 格式 + 模糊匹配
│   │   └── src/
│   │       ├── parser.rs            # Patch 语法解析 (954 行)
│   │       ├── seek_sequence.rs     # 模糊行定位算法 (163 行)
│   │       └── lib.rs               # apply_patch 主逻辑 (1689 行)
│   ├── tools/                       # 工具定义层：ToolExecutor trait
│   ├── protocol/                    # 协议类型：ResponseItem、AskForApproval 等
│   ├── codex-api/                   # OpenAI Responses API 客户端
│   ├── sandboxing/                  # ★ OS 级沙箱管理
│   ├── linux-sandbox/               # Linux Landlock/seccomp 实现
│   ├── execpolicy/                  # 命令分类规则引擎
│   ├── exec/                        # 命令执行层
│   ├── tui/                         # Ratatui 终端 UI
│   ├── cli/                         # CLI 入口
│   ├── hooks/                       # Hooks 系统
│   ├── ext/                         # 扩展：web-search、image-generation、memories...
│   └── (60+ 其他 crate)             # 工具库、认证、MCP、analytics 等
├── sdk/
│   ├── typescript/                  # TS SDK 包装
│   └── python/                      # Python SDK 包装
└── docs/
```

**关键观察**：

**(1) 100+ 个 Rust crate 的 workspace**——这不是过度工程。Rust 的编译模型让细粒度拆分有实际收益：每个 crate 独立编译缓存，改一个工具不用重编整个项目。而且 Codex 需要跨三个 OS 平台做沙箱集成，Rust 的条件编译（`#[cfg(target_os = "linux")]`）比 Node.js 的 optional dependencies 好管理得多。

**(2) `codex-cli/` 目录还在但已弃用**——仓库保留了原始 TypeScript 实现作为 legacy。从 TS 到 Rust 的重写说明了一个判断：编程 Agent 需要做 OS 级别的事（进程沙箱、文件系统监控、PTY 管理），Node.js 做这些要么靠 native addon 要么靠子进程，维护成本太高。

**(3) `sdk/` 是薄包装**——TS SDK 和 Python SDK 都是对 Rust 核心的包装，不是独立实现。这和 Claude Code 的策略类似（Python SDK 也是 subprocess 包装 TS CLI）。

## 整体架构

Codex CLI 的分层架构可以画成这样：

```
┌──────────────────────────────────────────────────────┐
│                     TUI / CLI                        │
│               (tui/ · cli/ · sdk/)                   │
├──────────────────────────────────────────────────────┤
│                  App Server 协议                      │
│  TUI ←→ Core 通过 App Server Protocol 通信，          │
│  同一接口也服务 IDE 客户端（VS Code 扩展）              │
├──────────────────────────────────────────────────────┤
│                   Core 内核                           │
│  Session → Turn 主循环 → ToolRouter → ToolCallRuntime │
├────────┬────────┬──────────┬────────┬────────────────┤
│ Tools  │ Patch  │ Sandbox  │  MCP   │  Multi-Agent   │
│ shell  │ apply  │ seatbelt │ rmcp   │  spawn/wait    │
│ patch  │ _patch │ landlock │ client │  send/close    │
│ goal   │        │ seccomp  │        │                │
├────────┴────────┴──────────┴────────┴────────────────┤
│              Codex API (codex-api/)                   │
│     SSE 流式 / WebSocket 持久连接 / 预热              │
│              → OpenAI Responses API                  │
└──────────────────────────────────────────────────────┘
```

**和 Claude Code 的架构对比**：Claude Code 是"一个 TypeScript 包做所有事"，Codex 是"100 个小 crate 分层组装"。Claude Code 的工具系统是扁平的（Bash/Read/Write/Edit/Glob/Grep/WebFetch 七个内置工具），Codex 的工具系统是 trait-based 注册 + 四种 exposure 模式（Direct / Deferred / DirectModelOnly / Hidden）。

## Agent 主循环

主循环在 `codex-rs/core/src/session/turn.rs:135` 的 `run_turn` 函数。这个文件有 2247 行，是整个项目最核心的代码。

```rust
// codex-rs/core/src/session/turn.rs:121-141 (简化)

/// Takes initial turn input and runs a loop where, at each sampling request,
/// the model replies with either requested function calls or an assistant
/// message. If the model requests a function call, we execute it and send
/// the output back to the model in the next sampling request.
pub(crate) async fn run_turn(
    sess: Arc<Session>,
    turn_context: Arc<TurnContext>,
    turn_extension_data: Arc<codex_extension_api::ExtensionData>,
    input: Vec<TurnInput>,
    prewarmed_client_session: Option<ModelClientSession>,
    cancellation_token: CancellationToken,
) -> Option<String> {
    // ...
```

内循环在 line 221 的 `loop`：

```rust
// codex-rs/core/src/session/turn.rs:221-262 (简化)

loop {
    // 1. 排空待处理输入（比如用户在模型运行时发的新消息）
    let pending_input = if can_drain_pending_input {
        sess.input_queue.get_pending_input(&sess.active_turn).await
    } else {
        Vec::new()
    };

    // 2. 克隆对话历史，构建发给模型的 input
    let sampling_request_input: Vec<ResponseItem> = {
        sess.clone_history().await
            .for_prompt(&turn_context.model_info.input_modalities)
    };

    // 3. 调用模型（通过 Responses API）
    match run_sampling_request(
        Arc::clone(&sess),
        Arc::clone(&turn_context),
        // ...
        sampling_request_input.clone(),
        cancellation_token.child_token(),
    ).await {
        Ok(SamplingRequestResult { needs_follow_up, .. }) => {
            // 4. 如果有 tool calls → needs_follow_up = true → 继续循环
            // 5. 如果只有 assistant message → needs_follow_up = false → break
            if !needs_follow_up { break; }
        }
        // ... error handling, auto-compact
    }
}
```

这个循环的本质和 Claude Code 是一样的——都是 ReAct loop 的变体：模型输出 → 解析 tool calls → 执行工具 → 结果回送模型 → 重复。但 Codex 有一个有意思的设计：它在等模型运行时支持 `pending_input`——用户可以在模型思考期间继续发消息，这些消息会在下一轮循环被 drain 进去。

### Responses API vs Messages API

Codex 使用 OpenAI 的 **Responses API**，不是 Chat Completions API。这是一个比较新的 API，请求结构和 Chat Completions 有本质区别：

```rust
// codex-rs/codex-api/src/common.rs:169-190

pub struct ResponsesApiRequest {
    pub model: String,
    pub instructions: String,          // system prompt 单独放
    pub input: Vec<ResponseItem>,       // 不是 messages 数组，是 items 数组
    pub tools: Vec<serde_json::Value>,
    pub tool_choice: String,
    pub parallel_tool_calls: bool,
    pub reasoning: Option<Reasoning>,
    pub store: bool,
    pub stream: bool,
    pub prompt_cache_key: Option<String>,
    // ...
}
```

和 Chat Completions 的 `messages: [{role, content}]` 对比，Responses API 用 `input: Vec<ResponseItem>`。`ResponseItem` 是一个大枚举——`Message`、`Reasoning`、`LocalShellCall`、`FunctionCall`、`FunctionCallOutput`、`Compaction` 等都是 item 变体。这种 item-based 设计让 tool call 和 tool result 成为和对话消息平级的一等公民，而不是嵌套在消息内容里的 tool_calls 数组。

传输层的另一个亮点：Codex 支持 **WebSocket 传输**（`ResponsesWebsocketClient`），可以在多轮 tool call 之间保持长连接，避免每次 HTTP 握手的延迟。还支持 `prewarm`——提前建立连接但不发请求，等真正需要时零延迟发送。

## apply_patch：文件编辑的另一条路

这是 Codex 和 Claude Code 分歧最大的地方。Claude Code 用 Edit 工具的 `old_string → new_string` 精确替换，Codex 用一种自定义的 patch 格式。

### Patch 格式

```
*** Begin Patch
*** Update File: src/config.rs
@@ fn parse_config
 fn parse_config(path: &str) -> Config {
-    let raw = std::fs::read(path).unwrap();
+    let raw = std::fs::read(path)
+        .context("failed to read config file")?;
     toml::from_slice(&raw).unwrap()
 }
*** End Patch
```

语法定义在 `codex-rs/apply-patch/src/parser.rs:4-23`（Lark 格式的正式文法）：

```
start: begin_patch hunk+ end_patch
begin_patch: "*** Begin Patch"
hunk: add_hunk | delete_hunk | update_hunk
add_hunk: "*** Add File: " filename add_line+
delete_hunk: "*** Delete File: " filename
update_hunk: "*** Update File: " filename change_move? change?
change_context: ("@@" | "@@ " context_line)
change_line: ("+" | "-" | " ") line
```

解析后产生 `Hunk` 枚举（`parser.rs:65`）：

```rust
pub enum Hunk {
    AddFile { path: PathBuf, contents: String },
    DeleteFile { path: PathBuf },
    UpdateFile { path: PathBuf, move_path: Option<PathBuf>, chunks: Vec<UpdateFileChunk> },
}
```

### seek_sequence：模糊匹配算法

这是 apply_patch 的核心创新。当 LLM 生成的 patch 里的"旧代码"和文件实际内容有微小差异时（多了空格、Unicode 引号 vs ASCII 引号），Claude Code 的 Edit 工具会直接报错"old_string not found"。Codex 的 `seek_sequence` 算法（`seek_sequence.rs:12`）用递减严格度来容错：

```rust
// codex-rs/apply-patch/src/seek_sequence.rs:12-110 (简化)

pub(crate) fn seek_sequence(
    lines: &[String],    // 文件实际内容
    pattern: &[String],  // patch 里的旧行
    start: usize,
    eof: bool,
) -> Option<usize> {
    // 第一轮：精确字节匹配
    for i in search_start..=lines.len().saturating_sub(pattern.len()) {
        if lines[i..i + pattern.len()] == *pattern { return Some(i); }
    }

    // 第二轮：忽略尾部空白
    // lines[i].trim_end() == pat.trim_end()

    // 第三轮：忽略首尾空白
    // lines[i].trim() == pat.trim()

    // 第四轮：Unicode 标点归一化到 ASCII
    fn normalise(s: &str) -> String {
        s.trim().chars().map(|c| match c {
            '\u{2010}'..='\u{2015}' | '\u{2212}' => '-',  // 各种 dash → ASCII -
            '\u{2018}' | '\u{2019}' => '\'',               // 花引号 → 直引号
            '\u{201C}' | '\u{201D}' => '"',                // 花双引号 → 直双引号
            '\u{00A0}' | '\u{2002}'..='\u{200A}' => ' ',   // 特殊空格 → 普通空格
            other => other,
        }).collect()
    }
}
```

四级容错：**精确 → 尾部空白不敏感 → 首尾空白不敏感 → Unicode 归一化**。这个设计的实战价值很高——LLM 生成的代码经常包含"隐形差异"（从网页复制来的 em-dash、ChatGPT 爱用的花引号），Claude Code 的 Edit 工具遇到这种情况就会失败，用户看到的是莫名其妙的"old_string not found in file"。

### 对比：apply_patch vs Claude Code Edit

| 维度 | Codex apply_patch | Claude Code Edit |
|---|---|---|
| 格式 | 类 unified diff 的自定义格式 | `old_string` → `new_string` 精确替换 |
| 定位机制 | `@@` 上下文行 + `seek_sequence` 模糊匹配 | 字符串精确匹配（`old_string` 必须唯一存在于文件中） |
| 空白容错 | 四级递减严格度 | 无容错，精确到每个空格 |
| 批量编辑 | 一个 patch 可以包含多个文件的多个 hunk | 一次 Edit 调用只改一处 |
| 新建/删除文件 | `*** Add File` / `*** Delete File` 内置支持 | 需要用单独的 Write 工具 |
| LLM 友好度 | 模型需要输出完整的 patch 格式（标记行多） | 只需输出要替换的旧文本和新文本 |
| 失败恢复 | `AppliedPatchDelta` 跟踪已应用的变更 | 失败直接返回错误 |

两种方案各有取舍。apply_patch 的容错性更好，但要求模型输出更多格式化标记（`*** Begin Patch`、`@@ context`、`+/-` 行前缀），这给模型更多出错的机会。Edit 工具的格式更简单（就两个字符串），但对匹配精度要求更高。

## OS 级沙箱

这是 Codex 和 Claude Code 之间最大的**安全架构差异**。Claude Code 的安全模型是"权限弹窗"——每个危险操作都弹窗问用户。Codex 的安全模型是"OS 沙箱"——在操作系统层面限制命令能做什么。

### 三平台沙箱

`codex-rs/sandboxing/src/manager.rs` 定义了三种沙箱类型：

```rust
// codex-rs/sandboxing/src/manager.rs:22-28

pub enum SandboxType {
    None,
    MacosSeatbelt,          // macOS: sandbox-exec + .sbpl 配置文件
    LinuxSeccomp,           // Linux: Landlock LSM / bubblewrap / seccomp
    WindowsRestrictedToken, // Windows: 受限令牌
}
```

每个命令执行时，`SandboxManager::transform` 方法会把原始命令包裹在平台对应的沙箱里：

- **macOS**: 用 `sandbox-exec` 配合 Seatbelt 描述文件（`.sbpl`），限制文件系统读写范围和网络访问
- **Linux**: 用 `codex-linux-sandbox` 二进制（`linux-sandbox/` crate），底层是 Landlock LSM 或 bubblewrap（`bwrap`），限制 mount namespace 和网络
- **Windows**: 用 restricted token 降权执行

### 审批策略

沙箱之上还有一层审批策略（`protocol/src/protocol.rs:787`）：

```rust
pub enum AskForApproval {
    // 只有已知安全的只读命令自动批准（最严格的交互模式）
    UnlessTrusted,
    // 模型自己决定什么时候需要问用户（默认）
    OnRequest,
    // 细粒度：按类别（shell、rules、skill、MCP）单独控制
    Granular(GranularApprovalConfig),
    // 全自动，永不问用户（CI/批量模式）
    Never,
}
```

`GranularApprovalConfig` 可以精细控制每类操作是否需要审批：

```rust
pub struct GranularApprovalConfig {
    pub sandbox_approval: bool,        // shell 命令
    pub rules: bool,                   // execpolicy 规则触发
    pub skill_approval: bool,          // skill 脚本执行
    pub request_permissions: bool,     // request_permissions 工具
    pub mcp_elicitations: bool,        // MCP 交互
}
```

### Exec Policy：命令分类引擎

在沙箱和审批之间，还有一层 **execpolicy**（`codex-rs/execpolicy/`）——基于规则的命令分类系统。它的 `rules_by_program` 把程序名映射到规则列表，每条规则匹配命令前缀后返回 `Allow` 或 `Deny`。

这意味着 Codex 的安全是三层：

```
命令输入 → execpolicy 规则匹配(Allow/Deny)
        → AskForApproval 审批策略(是否弹窗)
        → OS Sandbox 沙箱(限制执行范围)
```

Claude Code 只有中间一层（权限弹窗），没有 OS 沙箱层。Codex 的方案更安全——即使用户批准了一个命令，沙箱仍然限制它不能访问工作目录以外的文件、不能访问网络（除非显式允许）。代价是配置复杂度更高，而且 Seatbelt/Landlock 这些机制在不同 OS 版本上行为可能不一致。

## 工具系统

### ToolExecutor Trait

所有工具实现一个统一的 trait（`codex-rs/tools/src/tool_executor.rs:44`）：

```rust
#[async_trait::async_trait]
pub trait ToolExecutor<Invocation>: Send + Sync {
    fn tool_name(&self) -> ToolName;
    fn spec(&self) -> ToolSpec;
    fn exposure(&self) -> ToolExposure { ToolExposure::Direct }
    fn supports_parallel_tool_calls(&self) -> bool { false }
    async fn handle(&self, invocation: Invocation)
        -> Result<Box<dyn ToolOutput>, FunctionCallError>;
}
```

四种 exposure 模式：

| 模式 | 行为 | 用途 |
|---|---|---|
| `Direct` | 始终在模型工具列表里 | shell、apply_patch 等核心工具 |
| `Deferred` | 初始不可见，通过 tool_search 发现 | 不常用的工具，减少 prompt 膨胀 |
| `DirectModelOnly` | 在模型工具列表里，但 code-mode 下不暴露 | 特定模式专用工具 |
| `Hidden` | 注册可调度，但不暴露给模型 | 内部工具 |

**Deferred 模式**值得注意——它解决了"工具太多时 prompt 膨胀"的问题。Claude Code 也有类似的设计（ToolSearch 延迟加载），但 Codex 把它做成了 trait 级别的一等概念。

### 工具并发：RwLock 模型

工具并发执行通过 `ToolCallRuntime`（`core/src/tools/parallel.rs:31`）管理：

```rust
pub(crate) struct ToolCallRuntime {
    router: Arc<ToolRouter>,
    parallel_execution: Arc<RwLock<()>>,  // 关键：用 RwLock 控制并发
    // ...
}
```

执行时检查工具是否支持并行：

```rust
// codex-rs/core/src/tools/parallel.rs:113-119

tokio::spawn(async move {
    let _guard = if supports_parallel {
        Either::Left(lock.read().await)    // 可并行 → 读锁（多个同时跑）
    } else {
        Either::Right(lock.write().await)  // 不可并行 → 写锁（独占执行）
    };
    router.dispatch_tool_call_with_terminal_outcome(/* ... */).await
});
```

这个设计的精妙之处：**读锁可以共存，写锁必须独占**。多个 `supports_parallel_tool_calls() = true` 的工具可以同时运行（比如并行读多个文件），但一个非并行工具运行时会阻塞所有其他工具。这比 Claude Code 的默认串行执行更精细——允许安全的工具真正并行，同时保证有副作用的工具不被交错执行。

### 工具列表

`core/src/tools/handlers/` 目录下的工具实现：

| 处理器 | 功能 |
|---|---|
| `shell.rs` / `unified_exec/` | Shell 命令执行（核心工具） |
| `apply_patch.rs` | 文件编辑（调用 apply-patch crate） |
| `multi_agents/` | 子 Agent：spawn、wait、send_input、close |
| `multi_agents_v2/` | v2 多 Agent：增加 followup_task、list_agents、message_tool |
| `goal/` | 目标管理：create_goal、get_goal、update_goal |
| `mcp.rs` | MCP 工具转发 |
| `tool_search.rs` | Deferred 工具发现 |
| `request_user_input.rs` | 请求人工输入 |
| `request_permissions.rs` | 运行时权限提升 |
| `view_image.rs` | 图像查看 |
| `plan.rs` | 规划模式 |

和 Claude Code 的工具集对比：Codex **没有单独的 Read/Write/Edit/Grep/Glob 工具**——这些操作全部通过 shell 命令（`cat`、`grep`、`find`）和 `apply_patch` 完成。Claude Code 把文件操作拆成了 5 个专用工具，每个有精细的参数约束（比如 Read 默认 2000 行、Edit 必须先 Read）；Codex 把文件读写交给 shell 的通用能力，只有写入用 apply_patch 的专用格式。

## 多 Agent 系统

Codex 内建了完整的子 Agent 管理，比 Claude Code 的 Subagent 更重量级。工具目录下有两代实现：

- **v1**（`multi_agents/`）：`spawn` → `wait` → `send_input` → `close_agent`
- **v2**（`multi_agents_v2/`）：增加 `followup_task`、`list_agents`、`message_tool`、`send_message`

模型可以 spawn 一个子 Agent 去做独立任务（比如"在另一个目录跑测试"），通过 `wait` 等待结果，或者用 `send_message` 实时通信。每个子 Agent 有自己的 Session 和对话历史，但共享同一个 Sandbox 配置。

## 与 Claude Code 架构对比

| 维度 | Codex CLI | Claude Code |
|---|---|---|
| 语言 | Rust（100+ crate workspace） | TypeScript（单包 SDK） |
| API | OpenAI Responses API（item-based） | Anthropic Messages API（message-based） |
| 文件编辑 | `apply_patch` 自定义 patch + 模糊匹配 | `Edit` 工具 exact string replacement |
| 文件读取 | Shell 命令（`cat`、`head`） | 专用 `Read` 工具（默认 2000 行） |
| 安全模型 | OS 沙箱（Seatbelt/Landlock）+ execpolicy + 审批 | 权限弹窗 |
| 工具并发 | RwLock 读写锁精细控制 | 默认串行 |
| 工具可见性 | Direct / Deferred / Hidden 四种 exposure | ToolSearch 延迟加载 |
| 传输 | SSE + WebSocket（支持预热） | HTTP streaming |
| 多 Agent | spawn/wait/send_message 完整协议 | Subagent（隔离 context） |
| 扩展机制 | Plugin / Extension / Skill | Hooks / MCP |

**设计哲学差异**：Claude Code 追求"simple, composable"——7 个工具、一个权限模型、TypeScript 单包。Codex 追求"系统级控制"——OS 沙箱、Rust 性能、精细并发。如果类比，Claude Code 更像 macOS（简洁但你控制不了底层），Codex 更像 Linux（什么都能配但复杂度高）。

## 容易踩的坑

**1. apply_patch 的上下文行漂移**

- **现象**：apply_patch 成功了，但改到了错误的位置——因为文件中有多处相似代码
- **根因**：`seek_sequence` 从 `start` 位置开始搜索，如果 `@@` 上下文行不够有辨识度，可能匹配到错误位置
- **修法**：`@@` 行应该选最有辨识度的上下文（函数签名而不是空行），chunks 按文件顺序排列可以利用 `start` 的递增约束

**2. Seatbelt 沙箱在新版 macOS 上的兼容性**

- **现象**：在 macOS 15+ 上某些 shell 命令被沙箱拒绝，但在 macOS 14 上正常
- **根因**：Apple 持续收紧 `sandbox-exec` 的行为，某些之前允许的路径访问被新版拒绝
- **修法**：Codex 在 `sandboxing/src/seatbelt_base_policy.sbpl` 里维护了一个平台特定的 allow list，需要随 OS 更新

**3. WebSocket 连接的 sticky routing 失败**

- **现象**：多轮 tool call 中间突然延迟变高
- **根因**：WebSocket 连接断开后重连，新连接可能路由到不同的后端服务器，丢失了缓存的 KV cache
- **修法**：Codex 在 `codex-api/` 里实现了 `x-codex-turn-state` header 做 sticky routing，但网络不稳定时仍可能失败——这时 fallback 到 SSE

## 面试题深度解析

**Q1: 编程 Agent 的文件编辑有哪些实现方案？各自的 trade-off？**

- **30 秒版本**：三种主流方案——Codex 的 apply_patch（类 diff 格式 + 模糊匹配）、Claude Code 的 Edit（精确字符串替换）、Aider 的 SEARCH/REPLACE blocks。apply_patch 容错性最好但格式复杂，Edit 最简单但对 LLM 输出精度要求最高，SEARCH/REPLACE 居中。
- **追问：模糊匹配的风险？** seek_sequence 的四级容错在极端情况下可能匹配到错误位置——比如一个文件里有两个几乎一样的函数，只有空白不同。Codex 通过 `@@` 上下文行和 chunks 的顺序约束来缓解，但理论上不能完全避免。
- **追问：为什么 Codex 不直接用 unified diff？** 因为 LLM 生成标准 unified diff 的准确率不高——行号经常对不上。apply_patch 格式去掉了行号，用上下文内容定位，对 LLM 更友好。

**Q2: 编程 Agent 的安全模型怎么设计？权限弹窗 vs OS 沙箱？**

- **30 秒版本**：权限弹窗（Claude Code）把安全决策交给用户，简单但依赖用户判断——大多数用户会直接全部批准。OS 沙箱（Codex）在操作系统层面限制命令能力，即使用户批准了也不能越界，更安全但配置复杂。
- **追问：沙箱的具体限制？** Codex 的沙箱限制文件系统访问（只能读写工作目录和指定的额外路径）和网络访问（默认禁止，可通过网络策略开放）。macOS 用 Seatbelt profile 描述，Linux 用 Landlock 的 `path_beneath` 规则。
- **追问：为什么 Claude Code 不做 OS 沙箱？** 可能的原因：TypeScript 做 Seatbelt/Landlock 集成的工程成本很高（需要 native addon），而且 Claude Code 的权限模型结合 Hooks（PreToolUse 可以拦截危险命令）在实践中已经够用了。

**Q3: 为什么 Codex 从 TypeScript 重写到 Rust？**

- **30 秒版本**：编程 Agent 需要做三件 Node.js 不擅长的事——OS 级进程沙箱（需要调 Seatbelt/Landlock 内核接口）、高性能终端 UI（Ratatui vs blessed/ink）、跨平台编译到单二进制。Rust 在这三点上都有原生优势。
- **追问：Rust 的代价？** 编译时间长（100+ crate 首次编译可能 10+ 分钟）、贡献者门槛高（Rust 开发者比 TypeScript 少得多）、迭代速度慢（改一个工具的行为可能需要改三层 trait 实现）。OpenAI 选择 Rust 说明他们判断性能和安全的优先级高于迭代速度。

## 延伸阅读

- **[openai/codex](https://github.com/openai/codex)** — 仓库本身就是最好的学习材料。重点读 `codex-rs/core/src/session/turn.rs`（主循环）和 `codex-rs/apply-patch/src/seek_sequence.rs`（模糊匹配），这两个文件的信息密度最高
- **[OpenAI Responses API 文档](https://platform.openai.com/docs/api-reference/responses)** — 理解 item-based API 设计和 Chat Completions 的区别，这直接影响 Agent 循环的实现方式
- **[Apple Seatbelt 文档](https://developer.apple.com/documentation/security/app-sandbox)** — Codex 在 macOS 上的沙箱基础。Seatbelt profile 的写法是理解 Codex 安全模型的前提
- **[Landlock LSM](https://docs.kernel.org/userspace-api/landlock.html)** — Codex 在 Linux 上的沙箱基础。Landlock 是 Linux 5.13+ 引入的轻量级沙箱机制，比传统的 seccomp 更易用
- **[Claude Code 源码剖析](./claude-code)** — 本站的 Claude Code 分析文章。两篇对照读效果最佳——同一组问题的两套工程解法
