---
title: Browser Use 源码剖析
description: Browser Use 是 2024 年最流行的开源浏览器自动化 Agent（70k+ star），它的核心创新是把网页 DOM 序列化成带数字索引的 [index]<tag> 文本格式，让 LLM 用索引而非脆弱的 CSS selector 操作页面。本文从 agent/service.py 的四阶段 step 循环出发，拆解 DOM 序列化与索引标注、vision + 文本双通道、multi_act 批量动作的页面变化守卫、registry-based 动作系统。
pageClass: source-browser-use-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">Agent 源码解析</p>
  <h1>Browser Use 源码剖析</h1>
  <p class="doc-hero__lead">Browser Use 是 2024 年爆火的开源浏览器自动化 Agent，70k+ star。它解决的核心问题是：怎么让 LLM 可靠地操作网页？传统 RPA 用 CSS selector 或 XPath 定位元素，但页面一改就失效。Browser Use 的关键创新是把整个网页的可交互元素序列化成 <code>[5]&lt;button&gt;Submit&lt;/button&gt;</code> 这样带数字索引的文本，让 LLM 用"点击 5 号元素"这种稳定的索引引用来操作，而不碰脆弱的 selector。配合截图做视觉辅助，再用批量动作减少 LLM 调用——这套设计是 OpenAI Operator、各家 Computer Use 产品的开源对标实现。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>仓库：browser-use/browser-use · Python · 70k+ star</span>
    <span>分析版本：截至 2026-06 main 分支</span>
    <span>本文覆盖：四阶段 step 循环、DOM 索引序列化、vision 双通道、multi_act 批量动作</span>
  </div>
</section>

> **资料来源声明**：本文基于 [browser-use/browser-use](https://github.com/browser-use/browser-use) 的 main 分支真实源码（已 clone 到本地分析），所有文件路径、行号、函数签名从仓库直接读取。Browser Use 是 MIT 开源、Python 实现，底层用 Playwright/CDP 驱动 Chromium。本文标注 `browser_use/xxx/yyy.py:N` 形式的路径。

## 为什么值得读 Browser Use 源码

浏览器 Agent 和编程 Agent 是两类完全不同的问题。编程 Agent 操作的是文件和命令行（确定性强），浏览器 Agent 操作的是网页（动态、嘈杂、随时变化）。读 Browser Use 是为了理解这一类"操作图形界面"的 Agent 怎么设计：

```
- 怎么让 LLM 知道页面上有哪些可点击的元素？把整个 HTML 灌给它吗？
- 为什么不用 CSS selector，而是给每个元素编号让 LLM 用索引引用？
- 纯截图（vision）够不够？为什么还要文本化的 DOM？
- 一次 LLM 调用能不能执行多个动作（填表单 + 点提交）？怎么防止页面变了还在用旧的元素编号？
- 怎么处理 iframe、shadow DOM、动态加载这些网页的"脏"细节？
- CAPTCHA、登录态、弹窗这些现实障碍怎么应对？
```

Browser Use 的设计直接对标 OpenAI 的 Operator 和 Anthropic 的 Computer Use。读它的开源实现，等于读懂了这一代"GUI Agent"的核心范式。

## 仓库总览

```
browser-use/
├── browser_use/
│   ├── agent/                      # ★ Agent 核心
│   │   ├── service.py              # Agent 主类与 step 循环 (4132 行)
│   │   ├── prompts.py              # system prompt
│   │   ├── message_manager/        # 消息历史管理
│   │   └── views.py                # AgentOutput、ActionResult 等数据模型
│   ├── dom/                        # ★ DOM 处理——Browser Use 的灵魂
│   │   ├── service.py              # DOM 树构建、交互元素检测 (1174 行)
│   │   └── serializer/
│   │       ├── clickable_elements.py  # ★ 可交互元素判定
│   │       └── serializer.py       # ★ DOM → [index]<tag> 文本序列化
│   ├── browser/                    # 浏览器会话（Playwright/CDP）
│   ├── tools/                      # ★ 动作注册与执行
│   │   ├── service.py              # 内置动作（click/input/scroll/extract...）
│   │   └── registry/               # registry-based 动作系统
│   ├── llm/                        # 多 LLM provider 封装
│   ├── filesystem/                 # Agent 的文件系统（存中间结果）
│   ├── mcp/                        # MCP 集成
│   └── controller/                 # 控制器
├── examples/                       # 大量使用示例
└── tests/
```

**关键观察**：

**(1) `dom/` 目录是 Browser Use 的灵魂**——不是 `agent/`。浏览器 Agent 的核心难点不是 Agent 循环（那部分很标准），而是"怎么把一个混乱的网页变成 LLM 能理解的结构化输入"。`dom/serializer/` 就是干这个的。

**(2) `agent/service.py` 4132 行的巨型类**——和 Cline 的 Task 类类似，`Agent` 类持有一个浏览器自动化任务的全部状态。

**(3) `tools/service.py` 用 registry 模式注册动作**——`@registry.action(...)` 装饰器把 Python 函数注册成 LLM 可调用的动作，类似 Cline 的 handler 但更轻量。

## 核心创新：DOM 索引序列化

这是 Browser Use 最重要的设计，理解它就理解了整个项目。

### 问题：怎么告诉 LLM 页面上有什么

让 LLM 操作网页，第一个问题是"它怎么知道页面长什么样、有哪些能点的东西"。几种朴素方案都有问题：

- **把整个 HTML 灌给它**：一个现代网页的 HTML 动辄几万行，充满 `<div>` 嵌套、内联 style、tracking 脚本，token 爆炸且信噪比极低
- **只给截图（纯 vision）**：模型能"看到"页面，但没法精确指定"点哪个按钮"——它只能说"点左上角的蓝色按钮"，定位不精确
- **让 LLM 生成 CSS selector**：`button.btn-primary[data-id="submit"]`——脆弱，页面一改就失效，而且模型经常生成错误的 selector

### 解法：给每个可交互元素编号

Browser Use 的方案：遍历 DOM，找出所有**可交互**的元素（按钮、链接、输入框等），给每个分配一个数字索引，序列化成紧凑文本。LLM 看到的是这样：

```
[1]<a>首页</a>
[2]<a>产品</a>
[3]<input type="text" placeholder="搜索"/>
[4]<button>搜索</button>
*[5]<button>登录</button>
```

LLM 要点登录，就输出动作 `click_element_by_index(index=5)`。它不需要知道 CSS selector，只需要用索引。Browser Use 内部维护一个 `selector_map`（索引 → 真实 DOM 节点的映射），把索引翻译回真实元素去操作。

序列化格式在 `dom/serializer/serializer.py:883` 的 `serialize_tree`：

```python
# browser_use/dom/serializer/serializer.py:922-926 (简化)

line = f'{depth_str}{shadow_prefix}'
# 如果是可交互元素，加上索引标记
if node.is_interactive:
    new_prefix = '*' if node.is_new else ''   # ★ 新出现的元素加 * 前缀
    line += f'{new_prefix}[{node.original_node.backend_node_id}]'
line += f'<{tag}...'
```

注意那个 `*` 前缀——**新出现的元素会被标记**。当页面变化后（比如点了按钮弹出新菜单），新增的可交互元素前面加 `*`，提示 LLM"这些是刚出现的，可能是你上一步操作的结果"。这是个很贴心的设计，帮模型理解页面的动态变化。

### 怎么判定"可交互"

哪些元素该编号？`dom/serializer/clickable_elements.py:6` 的 `is_interactive` 用多重启发式判定：

```python
# browser_use/dom/serializer/clickable_elements.py (逻辑简化)

def is_interactive(node) -> bool:
    # 1. 明确的交互标签
    if node.tag_name.lower() in {'input', 'select', 'textarea', 'button', 'a'}:
        return True
    # 2. iframe/frame（可能嵌入交互内容）
    if node.tag_name.upper() in {'IFRAME', 'FRAME'}:
        return True
    # 3. label 关联表单控件
    if node.tag_name == 'label':
        # ...
    # 4. ARIA role（role="button" 等）
    # 5. 有 pointer cursor 样式
    # 6. 有 onclick 等事件监听器
    # ...
```

它不只看标签名，还看 ARIA role、CSS cursor 样式、事件监听器。因为现代网页大量用 `<div onclick=...>` 这种"伪按钮"——标签是 div 但实际能点。Browser Use 要把这些都识别出来，否则 LLM 就点不到它们。这部分的工程量很大（`dom/service.py` 1174 行大半在处理这些边界情况：shadow DOM、iframe、隐藏元素、paint order 遮挡）。

## 四阶段 step 循环

主循环在 `agent/service.py:1023` 的 `step` 方法。它分四个阶段（Phase 0-3）：

```python
# browser_use/agent/service.py:1023-1073 (简化)

async def step(self, step_info=None) -> None:
    """Execute one step of the task"""
    try:
        # Phase 0: 等待 CAPTCHA 解决（如果有）
        if self.browser_session:
            captcha_wait = await self.browser_session.wait_if_captcha_solving()
            # ...

        # Phase 1: 准备上下文——抓取浏览器状态 + 截图
        browser_state_summary = await self._prepare_context(step_info)

        # Phase 2: 调模型拿到下一步动作，然后执行
        await self._get_next_action(browser_state_summary)
        await self._execute_actions()

        # Phase 3: 后处理
        await self._post_process()

    except Exception as e:
        await self._handle_step_error(e)
    finally:
        await self._finalize(browser_state_summary)
```

`_prepare_context`（`service.py:1075`）是关键——它调 `get_browser_state_summary` 抓取当前页面状态，**总是带截图**（`service.py:1084-1085`）：

```python
browser_state_summary = await self.browser_session.get_browser_state_summary(
    include_screenshot=True,  # 即使 use_vision=False 也截图（云端同步用，反正很快）
    include_recent_events=self.include_recent_events,
)
```

每一步喂给 LLM 的是：**序列化的 DOM 文本（带索引）+ 页面截图**。两路信息互补。

## Vision + 文本双通道

为什么既要文本化 DOM 又要截图？因为两者各有盲区：

| 信息源 | 优势 | 盲区 |
|---|---|---|
| 序列化 DOM 文本 | 精确（每个元素有索引可操作）、结构清晰 | 看不出视觉布局、颜色、图片内容、元素的空间关系 |
| 截图（vision） | 看得到布局、视觉状态、图片、哪些是醒目的 | 没法精确引用元素（只能描述位置） |

Browser Use 的做法是**两个都给**：截图让模型"看懂"页面（这个按钮是不是禁用了？弹窗挡住了吗？），DOM 文本让模型"精确操作"（点 5 号元素）。模型综合两路信息决策。这正是 OpenAI Operator、Anthropic Computer Use 的思路——只不过那些是端到端 vision 模型直接输出坐标，Browser Use 用"vision 理解 + 索引操作"的混合方案，对普通 LLM（不一定有强 vision）更友好。

`use_vision` 可以配置。即使关掉 vision（纯文本 DOM），Browser Use 也能跑——这对成本敏感或用纯文本模型的场景有用。

## multi_act：批量动作与页面变化守卫

这是 Browser Use 一个重要的性能优化，也是最容易出 bug 的地方。

### 一次 LLM 调用，多个动作

LLM 调用很慢很贵。如果每点一下都要调一次 LLM，填一个 10 字段的表单要 11 次调用（10 次填 + 1 次提交）。Browser Use 允许 LLM 一次输出**多个动作**，批量执行（`agent/service.py:2711` 的 `multi_act`）：

```python
# LLM 一次可以输出
[
  {"input_text": {"index": 3, "text": "张三"}},
  {"input_text": {"index": 4, "text": "zhangsan@example.com"}},
  {"click_element_by_index": {"index": 5}}
]
```

但这里有个致命风险：**页面会变**。填完第一个字段，页面可能 JS 重渲染，元素索引全变了。这时再用旧的索引点击，就会点错元素。

### 两层页面变化守卫

`multi_act` 用两层保护防止"对着过期的 DOM 操作"（`service.py:2712-2718` 的注释）：

```python
# browser_use/agent/service.py:2711-2718

"""Execute multiple actions with page-change guards.

Two layers of protection prevent executing actions against stale DOM:
  1. Static flag: actions tagged with terminates_sequence=True (navigate, search,
     go_back, switch) automatically abort remaining queued actions.
  2. Runtime detection: after every action, the current URL and focused target are
     compared to pre-action values. Any change aborts the remaining queue.
"""
```

**第一层：静态标记**。某些动作天生会让页面大变——导航、搜索、后退、切标签。这些动作注册时标了 `terminates_sequence=True`（`tools/service.py:562`）。一旦执行了这类动作，队列里剩下的动作立即中止，回到主循环重新抓取页面状态。

**第二层：运行时检测**。每执行一个动作后，对比执行前后的 URL 和焦点元素（`service.py:2759-2761`）：

```python
# 执行动作前记录状态
pre_action_url = await self.browser_session.get_current_page_url()
pre_action_focus = self.browser_session.agent_focus_target_id

result = await self.tools.act(action=action, ...)

# 执行后对比，如果 URL 或焦点变了 → 中止剩余队列
```

只要 URL 或焦点变了，就认为页面状态可能失效，中止剩余动作，重新走一遍 step 抓取新状态。还有个细节：`done`（任务完成）动作只能单独出现（`service.py:2742-2746`）——不允许"做几个动作然后 done"，必须确认前面的动作都成功了才能 done。

这套守卫机制是 Browser Use 可靠性的关键。批量动作提升了效率，页面变化守卫保证了正确性，两者配合才能既快又稳。

## registry-based 动作系统

Browser Use 的动作（工具）用装饰器注册。`tools/service.py:2042` 的 `action` 装饰器：

```python
# browser_use/tools/service.py:2042-2047

def action(self, description: str, **kwargs):
    """Decorator for registering custom actions
    @param description: Describe the LLM what the function does
    """
    return self.registry.action(description, **kwargs)
```

内置动作（`tools/service.py`）包括：

| 动作 | 作用 |
|---|---|
| `click_element_by_index` | 点击索引元素 |
| `input_text` | 在索引元素输入文本 |
| `scroll` | 滚动页面 |
| `go_to_url` | 导航到 URL（`terminates_sequence=True`） |
| `go_back` | 后退（`terminates_sequence=True`） |
| `extract` | 从页面 markdown 提取结构化数据 |
| `done` | 标记任务完成 |
| `search` | 搜索（`terminates_sequence=True`） |

`extract` 动作（`tools/service.py:1038`）值得一提——它把当前页面转成 markdown，用一个单独的 LLM 调用提取结构化数据。这解决了"从页面读信息"的需求：主 Agent 负责操作（点、填），`extract` 负责读取（抓表格、列表、价格）。两者分工，主 Agent 的 context 不被大段页面内容污染。

自定义动作很简单——用 `@tools.action("描述")` 装饰一个 Python 函数就行。`description` 直接作为 function calling 的工具描述给 LLM，描述写得好坏直接影响模型调用准确率。

## 容易踩的坑

**1. 批量动作里页面提前变化**

- **现象**：LLM 输出 5 个动作，执行到第 2 个时页面跳转，后面 3 个点错了元素
- **根因**：批量动作基于"执行时页面不变"的假设，但有些动作会触发意外的 JS 跳转
- **修法**：Browser Use 的两层守卫（terminates_sequence + URL/焦点检测）能拦截大部分，但 JS 异步渲染（没改 URL 但 DOM 变了）仍可能漏网。对关键操作，可以让 LLM 一步只做一个动作

**2. 可交互元素漏检**

- **现象**：页面上明明有个能点的东西，但 DOM 序列化里没给它编号，LLM 点不到
- **根因**：那个元素用了非标准的交互实现（比如纯 CSS、复杂的 shadow DOM、被遮挡），`is_interactive` 的启发式没覆盖到
- **修法**：`clickable_elements.py` 的判定逻辑在持续迭代。遇到漏检，可以检查元素是否有 ARIA role、是否在 iframe 里、是否被 paint order 判定为遮挡

**3. 索引在截图和文本之间对不上**

- **现象**：开了 vision，但模型根据截图判断的位置和 DOM 索引对应错了
- **根因**：截图和 DOM 序列化是两个独立过程，如果页面在两者之间发生了变化，索引会错位
- **修法**：Browser Use 尽量让截图和 DOM 抓取在同一时刻。但动态页面仍有风险——这也是为什么页面变化守卫如此重要

**4. token 爆炸于复杂页面**

- **现象**：在元素极多的页面（比如商品列表上千个），序列化 DOM 撑爆 context
- **根因**：可交互元素太多，每个都序列化就超长
- **修法**：Browser Use 有视口过滤（只序列化可见区域附近的元素）、元素去重等优化。复杂页面建议先 scroll 聚焦到目标区域再操作

## 面试题深度解析

**Q1: 为什么 Browser Use 用数字索引而不是 CSS selector 让 LLM 操作元素？**

- **30 秒版本**：CSS selector 脆弱（页面一改就失效）且 LLM 容易生成错误的 selector。数字索引是 Browser Use 内部分配的稳定引用——LLM 只需说"点 5 号元素"，内部用 selector_map 翻译回真实节点。这把"定位元素"的责任从 LLM（不可靠）转移到了框架（可靠）。
- **追问：索引在页面变化后怎么保持有效？** 不保持——每次 step 重新序列化 DOM，索引重新分配。所以索引只在单个 step 内有效。批量动作里如果页面变了，页面变化守卫会中止剩余动作，强制重新抓取和编号。
- **追问：和 OpenAI Operator 的坐标点击有什么区别？** Operator 是端到端 vision 模型，直接输出点击坐标 (x, y)。Browser Use 是"vision 理解 + 索引操作"——用截图帮模型理解，但操作走 DOM 索引（更精确，不依赖模型的坐标定位能力）。Browser Use 的方案对没有强 vision 的普通 LLM 也能用。

**Q2: 浏览器 Agent 为什么既要截图又要文本化 DOM？**

- **30 秒版本**：两者互补。截图（vision）让模型看懂视觉布局、状态、图片——但没法精确引用元素。文本化 DOM（带索引）让模型精确操作——但看不出视觉信息。结合起来：vision 负责"理解页面"，DOM 索引负责"精确操作"。
- **追问：能只用一个吗？** 能但有代价。纯 vision（像 Operator）需要强 vision 模型且坐标定位不够稳；纯 DOM 文本省 token 但模型看不到视觉状态（按钮禁用了吗、弹窗挡住了吗）。Browser Use 的 `use_vision` 可配置，权衡成本和能力。
- **追问：截图开销大吗？** 源码里即使 `use_vision=False` 也截图（为了云端同步），注释说"反正很快"。但截图会增加 vision token 消耗，成本敏感场景可以真正关掉。

**Q3: 批量执行多个动作的风险是什么？怎么解决？**

- **30 秒版本**：风险是页面在动作之间变化，导致后续动作用着过期的元素索引点错。Browser Use 用两层守卫：①静态标记——导航/搜索等会大改页面的动作标 terminates_sequence，执行后立即中止剩余队列；②运行时检测——每个动作后对比 URL 和焦点，变了就中止。
- **追问：为什么要批量？** 减少 LLM 调用。填一个 10 字段表单，批量动作一次 LLM 调用就能填完，否则要 10+ 次。LLM 调用是浏览器 Agent 最大的延迟和成本来源。
- **追问：done 为什么必须单独？** 防止"做几个动作然后立即 done"——必须等前面动作的结果确认成功，才能判断任务是否真的完成。源码里强制 done 只能作为单个动作出现。

## 延伸阅读

- **[browser-use/browser-use](https://github.com/browser-use/browser-use)** — 仓库本身。重点读 `browser_use/dom/serializer/serializer.py`（DOM 索引序列化）和 `clickable_elements.py`（可交互元素判定），这是浏览器 Agent 最核心的工程难点
- **[Browser Use 官方文档](https://docs.browser-use.com)** — 理解 use_vision、自定义 action、并行任务等用法
- **[OpenAI Operator / Computer Use](https://openai.com/index/computer-using-agent/)** — 闭源对标。理解端到端 vision Agent（直接输出坐标）和 Browser Use 的"vision + 索引"混合方案的区别
- **[Anthropic Computer Use](https://docs.anthropic.com/en/docs/build-with-claude/computer-use)** — Claude 的 computer use 工具。同样是 GUI Agent，但走截图 + 坐标路线，和 Browser Use 的 DOM 索引路线形成对比
- **[Claude Code 源码剖析](./claude-code)** — 编程 Agent 的对照。浏览器 Agent（操作动态 GUI）和编程 Agent（操作文件/命令）是两类 Agent，对比能理解"环境的确定性"如何决定 Agent 的设计
