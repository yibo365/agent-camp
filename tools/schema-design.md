---
title: 工具 Schema 设计
description: 命名、描述、参数、返回值——模型看不到你的代码，只能从 schema 里推断"这个工具是不是我现在该用的"。这层文本怎么写，决定 80% 的工具调用成败。
pageClass: tools-schema-design-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">工具调用</p>
  <h1>工具 Schema 设计</h1>
  <p class="doc-hero__lead">模型看不到你的代码——它只能看到 schema 里的名字、描述和参数说明。这层薄薄的文本就是它做决定的全部信息。本文讲怎么把这一层写好。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：Agent 工程化</span>
    <span>核心：name / description / params / return 的设计原则</span>
    <span>面试重点：诊断"模型调错"是 schema 还是模型问题</span>
  </div>
</section>

> **本文边界**：聚焦 **工具 schema 文本本身的写法**——name、description、parameters、return 怎么设计。**调用协议**（OpenAI / Anthropic 的 JSON Schema 格式、tool_use / tool_result 流转）见 [function calling 规范](./function-calling)；**端到端实战**（定义到部署）见 [自定义工具实现](./custom-tools)；**MCP 协议层**见 [MCP 协议](./mcp)；**错误返回的具体格式**见 [工具错误处理](./error-handling)。本文是协议无关的"内容设计"原则。

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>模型为什么会调错工具？是模型问题还是 schema 问题，怎么 debug？</strong>
    <span>考核心：能不能区分"指令理解错"和"工具描述写得让模型必然误解"。</span>
  </div>
  <div>
    <strong>tool description 应该用第一人称（"Use this when..."）还是第三人称（"This function returns..."）？为什么？</strong>
    <span>考有没有真的读过 OpenAI / Anthropic 的官方建议，理解模型的视角。</span>
  </div>
  <div>
    <strong>参数用 string + 自由文本还是 enum？什么时候用哪个？</strong>
    <span>考类型设计的取舍——表达力 vs 约束。</span>
  </div>
  <div>
    <strong>一个工具的 description 多长合适？什么时候该拆成两个工具？</strong>
    <span>考粒度选择的判据。</span>
  </div>
  <div>
    <strong>返回值用结构化 JSON 还是自然语言文本？</strong>
    <span>考工程经验——大多数人这里都是直觉答错。</span>
  </div>
  <div>
    <strong>schema 改了能热更新吗？已经跑着的对话怎么办？</strong>
    <span>考生产意识，是否考虑过 cache、对话连贯性。</span>
  </div>
  <div>
    <strong>OpenAI 和 Anthropic 在 tool schema 上有哪些不兼容的差异？</strong>
    <span>考跨厂商工程经验：oneOf / additionalProperties / description 长度限制。</span>
  </div>
  <div>
    <strong>给你 20 个工具的 schema，让模型选——你怎么排序、怎么裁剪？</strong>
    <span>考工具集规模化时的实际问题（选择空间爆炸）。</span>
  </div>
</div>

---

## 模型看到的只有 schema

写工具最大的认知陷阱：你看到的是函数实现，模型看到的只有 schema。

```python
# 你看到的（你脑子里"这个工具很清楚"）
def get_user_orders(user_id: str, status: str = "all", limit: int = 10):
    """根据 user_id 查询订单列表"""
    return db.query(
        "SELECT * FROM orders WHERE user_id = ? AND status = ?",
        user_id, status
    )[:limit]

# 模型看到的（schema 序列化后真实进入 prompt 的样子）
{
  "name": "get_user_orders",
  "description": "根据 user_id 查询订单列表",
  "parameters": {
    "type": "object",
    "properties": {
      "user_id": {"type": "string"},
      "status": {"type": "string"},
      "limit": {"type": "integer"}
    },
    "required": ["user_id"]
  }
}
```

把上面这个 schema 给模型，它会犯下面这些错：

- **`status` 该填什么？** "active"？"open"？"unpaid"？"shipped"？schema 没说合法值是哪些。模型只能猜。
- **`user_id` 是数字 ID 还是 email？** 函数实现里你知道是 UUID，但 schema 里就是个 `string`。
- **`limit` 不传会怎样？** schema 没说默认值是 10，模型可能瞎填 100。
- **什么时候该用这个工具？** description 只说"查询订单列表"——用户问"我上周买的那个还没到"，模型该调这个工具吗？还是该调 `get_order_status`？

每一个模糊点都是一次调错工具的机会。**schema 不是给人看的文档，是 LLM 的决策依据**——它决定模型在面对自然语言请求时，选哪个工具、填什么参数。

这件事的工程意义：**schema 设计质量 ≈ 工具调用成功率的上限**。模型再聪明，schema 写得不清楚它也只能猜。反过来，schema 写得好，弱模型也能调对。Anthropic 在 [tool use 文档](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview) 里把这一点放在最显眼位置：

> *"The most important factor in Claude's tool use performance is the quality of your tool descriptions."*

这话不是营销——是观察到无数客户因为 description 写得太短而调用失败之后的提炼。

---

## 命名：动词开头 + snake_case + 无歧义

工具名是模型在工具列表里**第一眼看到的东西**。命名糟糕的代价：模型在 20 个工具里选错那一个。

### 命名规范的三条铁律

| 规则 | 好例子 | 坏例子 | 为什么 |
|---|---|---|---|
| **动词开头** | `get_order`、`search_docs`、`create_invoice` | `order`、`docs`、`invoice_helper` | 工具是"做某事"，名字是动词意图最清晰 |
| **snake_case** | `get_user_profile` | `getUserProfile`、`get-user-profile`、`GetUserProfile` | 多数 SDK 强制 snake_case；camelCase 容易混入 JSON key 让模型疑惑 |
| **领域 + 动作明确** | `search_inventory`、`update_shipping_address` | `do_thing`、`process_data`、`handle_request` | "process"、"handle"、"data"、"thing" 是零信息词 |

### 动词约定（业界事实标准）

| 前缀 | 语义 | 例子 |
|---|---|---|
| `get_` | 按 ID 取单个 | `get_order`、`get_user` |
| `list_` / `search_` | 取列表，list 是无过滤，search 是带 query | `list_orders`、`search_products` |
| `create_` | 新建 | `create_ticket` |
| `update_` | 修改已有 | `update_address` |
| `delete_` | 删除 | `delete_session` |
| `run_` / `execute_` | 执行有副作用的动作 | `run_query`、`execute_payment` |
| `check_` / `validate_` | 只读校验 | `check_inventory`、`validate_coupon` |

这套和 REST API 的动词、SQL 关键词高度一致——**模型预训练时见过大量这种命名**，认得这些前缀代表什么意图。用反直觉的名字（比如 `fetch_` 表示创建、`do_` 表示查询）就是逆着模型的先验。

### 反命名实战对照

| 烂命名 | 模型容易混淆成什么 | 改法 |
|---|---|---|
| `data_op` | 完全不知道做什么 | `query_metrics` / `aggregate_metrics` |
| `helper` | 万能工具？最后一步用？ | 按实际功能拆：`format_address`、`parse_invoice` |
| `process_order` | 处理是创建？支付？发货？哪一步？ | `confirm_order`、`ship_order`、`refund_order` 分开 |
| `manage_user` | 增删改查都能干？ | 拆成 `create_user` / `update_user` / `deactivate_user` |
| `query` | 查什么？怎么 query？ | `search_logs`、`query_db`（明确目标） |
| `tool1` / `func_a` | 完全无意义 | 重新命名（这种通常出现在 demo 代码里被复制到生产） |

**判断方法**：把工具列表打印出来，盖住 description，只看名字——你自己一眼能看出"这个工具干啥的吗？什么时候该调？"如果你自己看不出来，模型也看不出来。

---

## description：站在模型的视角写

description 是 schema 里**最容易写糟糕**的部分。常见的失败模式不是写错，而是**写成给开发者读的代码注释**：

```text
# 烂 description（给开发者读的）
"This function queries the orders database using SQL and returns a list of order objects. It uses the OrderService class internally."

# 好 description（给模型读的）
"Look up a customer's past orders by their user ID. Use this when the user asks about order history, recent purchases, or wants to find a specific order they've placed before. Returns up to 10 most recent orders with status, amount, and timestamp."
```

差别在哪？后者告诉模型三件事：(1) **能干什么**——查订单历史；(2) **什么场景用**——用户问历史、找某个订单时；(3) **会得到什么**——最多 10 条，含状态/金额/时间。前者只告诉模型"内部用了 SQL"——模型不在乎实现。

### description 的标准结构

OpenAI 和 Anthropic 的官方建议高度一致。Anthropic [tool use best practices](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use) 推荐每个 description 包含：

1. **一句话功能**（这个工具做什么）
2. **何时使用**（"Use when..."、"Use this for..."）
3. **何时不使用**（边界——什么场景该用别的工具）
4. **关键限制**（数量上限、性能边界、副作用）
5. **可选：示例触发短语**（"For example, if user asks 'X' or 'Y'..."）

完整示例：

```text
Search the company's internal documentation for relevant articles.

Use this when:
- User asks "how do I..." about internal tools, policies, or processes
- You need authoritative reference for a specific company procedure
- The question requires content from team wikis, runbooks, or onboarding docs

Don't use this for:
- General programming questions (use `search_web` instead)
- Customer-facing product questions (use `search_help_center`)
- Real-time data like server status (use `get_metrics`)

Returns top 5 most relevant article chunks (max 500 tokens each), ranked by relevance score.
```

这段 description 大概 110 个英文单词，看起来很长。但**它把模型选择这个工具时所有需要知道的信息都说清楚了**——这才是 description 的价值。

### 第一人称 vs 第三人称

老问题：description 用 "Use this to..." 还是 "This function..."？

| 视角 | 例子 | 评价 |
|---|---|---|
| **第二人称指令式** | "Use this to look up an order" | **推荐** —— 模型视角，直接告诉它"什么场景该用我" |
| **第三人称描述式** | "This function looks up an order" | 也行 —— 像 docstring，模型也能理解 |
| **第一人称** | "I look up orders" | 不推荐 —— 模型自己也会说 "I"，混淆 |

OpenAI cookbook 里大部分例子用第三人称（"Retrieves the current weather..."），Anthropic 的官方文档更偏向第二人称指令式（"Use this when..."）。**两种都可以，但同一个工具集内必须统一风格**——风格混杂会让模型产生"这些工具不是同一套"的暗示。

### description 长度的经验法则

| 工具数量 | 单个 description 建议长度 |
|---|---|
| < 5 个工具 | 1-2 句话即可（场景简单，模型不容易混） |
| 5-15 个工具 | 3-5 句话（明确"何时用 / 何时不用"） |
| 15-30 个工具 | 详细 description（5-10 句），强调和最相近工具的区分 |
| 30+ 个工具 | description 之外还需要工具检索/筛选层（不要把所有工具都塞进 prompt） |

**OpenAI 单个 function description 上限是 1024 字符**（[官方文档](https://platform.openai.com/docs/api-reference/chat/create#chat-create-tools)），Anthropic 没有硬上限但建议不超过几百 token。**绝对不要逼近上限**——上限附近的描述说明你要么内容冗余、要么应该拆工具。

---

## 参数设计：类型、约束、默认值

参数是 schema 里**模型出错率最高**的部分。模型会乱填，乱填的程度和 schema 的约束强度直接挂钩。

### 类型选择：string vs enum

最常见的错误：**自由文本 string 接收本应是枚举的值**。

```python
# 反例 ❌
{
  "name": "search_orders",
  "parameters": {
    "properties": {
      "status": {
        "type": "string",
        "description": "Order status"
      }
    }
  }
}
```

模型实际填进去的 `status` 是什么？取决于它的"猜":
- "active" / "open" / "pending" / "unpaid" / "in_progress" / "processing" ...

后端代码只认识 "pending" / "shipped" / "delivered" / "cancelled" 四个值——其他任何输入要么报错要么返回空。模型不知道这个约束，每次填的都可能不一样。

```python
# 正例 ✅
{
  "name": "search_orders",
  "parameters": {
    "properties": {
      "status": {
        "type": "string",
        "enum": ["pending", "shipped", "delivered", "cancelled"],
        "description": "Order status. 'pending' = paid but not shipped, 'shipped' = in transit, 'delivered' = received, 'cancelled' = refunded or voided."
      }
    }
  }
}
```

`enum` 把模型的自由度锁死在四个合法值——再加上 description 解释每个值的含义，模型基本不会填错。

**判断规则**：**任何后端有"合法值列表"的字段，schema 里必须用 enum**——不要因为"代码里是 string 类型"就在 schema 里也写 string。Schema 的类型是给 LLM 看的契约，和后端代码的类型是两件事。

### 参数描述：每个字段必须有 description

JSON Schema 允许参数没有 description，**但你绝对不要省**。每个参数都要有 description，告诉模型：

- **值的含义**（不是字段名能直接表达的部分）
- **格式约束**（"ISO 8601 date"、"UUID v4"、"email format"）
- **范围/单位**（"between 1 and 100"、"in USD"、"unix timestamp in seconds"）
- **示例值**（写在 description 末尾，"e.g. 'order_abc123'"）

```python
# 烂参数描述 ❌
{
  "user_id": {"type": "string", "description": "user id"}
}

# 好参数描述 ✅
{
  "user_id": {
    "type": "string",
    "description": "The customer's unique identifier in UUID v4 format (e.g. 'usr_a1b2c3d4-e5f6-...'). Not the email or username—use search_user_by_email if you only have email."
  }
}
```

第二个版本告诉模型：(1) 格式是 UUID；(2) 不是 email；(3) 如果只有 email 该用别的工具。三句话直接消除了三种潜在的调用错误。

### 必选 vs 可选 + 默认值的陷阱

JSON Schema 的 `required` 数组定义哪些字段必填。**最容易踩的坑**：把应该有默认值的字段标记成可选，但 schema 里不写默认值。

```python
# 反例 ❌
{
  "name": "search_docs",
  "parameters": {
    "properties": {
      "query": {"type": "string"},
      "limit": {"type": "integer", "description": "Max results"}
    },
    "required": ["query"]
  }
}
# 模型不传 limit 时——后端拿到的是 None / undefined，要么崩、要么用了你不知道的默认
# 模型传 limit 时——可能填 100、1000、99999 都有
```

```python
# 正例 ✅
{
  "name": "search_docs",
  "parameters": {
    "properties": {
      "query": {"type": "string"},
      "limit": {
        "type": "integer",
        "description": "Max results to return. Default 5 if not specified. Must be between 1 and 20.",
        "minimum": 1,
        "maximum": 20,
        "default": 5
      }
    },
    "required": ["query"]
  }
}
```

`minimum` / `maximum` / `default` 不仅是 schema 约束，**模型会读 description 里的"Default 5"和"between 1 and 20"**，从而正确决策"我该不该传 limit"以及"传多少合理"。

> ⚠️ **注意**：JSON Schema 的 `default` 字段在 OpenAI / Anthropic 的当前实现里**不会被自动应用**——它只是个"提示性元数据"。真正的默认值仍要在你后端代码里处理。但写进 schema 的好处是让模型知道"这个字段有默认值，不传也行"。

### 嵌套对象：能扁平就扁平

模型对**深层嵌套对象的填充能力显著弱于扁平结构**。

```python
# 反例 ❌（深度嵌套）
{
  "name": "create_order",
  "parameters": {
    "properties": {
      "order": {
        "type": "object",
        "properties": {
          "customer": {
            "type": "object",
            "properties": {
              "info": {
                "type": "object",
                "properties": {
                  "name": {"type": "string"},
                  "email": {"type": "string"}
                }
              }
            }
          }
        }
      }
    }
  }
}
```

模型生成这种嵌套结构时容易：(1) 漏掉中间层级；(2) 嵌套层级数量错；(3) JSON 解析失败。

```python
# 正例 ✅（扁平化）
{
  "name": "create_order",
  "parameters": {
    "properties": {
      "customer_name": {"type": "string"},
      "customer_email": {"type": "string"},
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "sku": {"type": "string"},
            "quantity": {"type": "integer"}
          }
        }
      }
    },
    "required": ["customer_name", "customer_email", "items"]
  }
}
```

**经验法则**：嵌套深度 ≤ 2 层。array of object 是必要的（订单的多个商品），但 object 套 object 套 object 几乎都可以扁平化。

---

## 返回值：结构化为主，文本为辅

很多人写工具时忽略返回值 schema——觉得"反正模型读到返回值会自己理解"。这是错的。**返回值的结构决定模型理解的准确性和成本**。

### 文本 vs 结构化

| 返回形式 | 优点 | 缺点 | 何时用 |
|---|---|---|---|
| **纯文本** | 模型直接读、token 少 | 没有边界、长结果时模型抓不到重点 | 简单单值（如时间、状态） |
| **结构化 JSON** | 字段清晰、易截断、易过滤 | token 略多（带 key） | 多字段实体、列表 |
| **半结构化（JSON + 摘要文本）** | 模型友好、便于多步推理 | 设计稍复杂 | 大多数生产工具 |

实战推荐**半结构化**：

```json
{
  "summary": "Found 3 orders for user usr_abc123 in the last 30 days.",
  "orders": [
    {"id": "ord_001", "status": "delivered", "amount": 89.00, "date": "2026-05-12"},
    {"id": "ord_002", "status": "shipped", "amount": 156.50, "date": "2026-05-20"},
    {"id": "ord_003", "status": "pending", "amount": 42.99, "date": "2026-05-28"}
  ],
  "has_more": false
}
```

`summary` 让模型快速抓重点，`orders` 让它能引用具体字段，`has_more` 告诉它要不要追问翻页。这种结构**经验上比纯 JSON 列表能让下游推理质量高 20%+**——模型在长 history 里只需读 summary 就能维持上下文，省 token 又不丢信息。

### 错误如何编码

错误返回**不要直接抛异常或返回 HTTP 错误码**——工具调用上下文里"错误"是模型需要理解并决策（重试？换工具？告诉用户？）的信号，必须用结构化方式表达：

```json
{
  "error": {
    "code": "user_not_found",
    "message": "No user exists with ID usr_xyz",
    "suggestion": "Verify the user ID or use search_user_by_email to find by email."
  }
}
```

详细的错误设计模式见 [工具错误处理](./error-handling)——本文只说**错误本身也是 schema 的一部分**，要在 description 里告诉模型"可能返回 error，error.code 有以下几种：..."，否则模型遇到错误返回时不知道该怎么处理。

### 长结果的截断

返回 10 万行日志的工具会立刻让 context 爆炸。**截断必须在工具层完成，不能让模型自己处理全量**：

```python
def search_logs(query: str, limit: int = 50) -> dict:
    results = db.search(query)
    truncated = len(results) > limit
    return {
        "summary": f"Found {len(results)} matches, showing {min(limit, len(results))}.",
        "logs": results[:limit],
        "truncated": truncated,
        "next_action_hint": "If you need more, refine the query or paginate with offset parameter." if truncated else None
    }
```

`truncated` 标志和 `next_action_hint` 让模型知道"还有更多"并能决策下一步。比直接返回前 50 条让它误以为"就这 50 条"靠谱得多。

---

## 反模式速查：12 个常见错误

下面是生产实战中反复看到的 schema 反模式。每个都配修复版。

### 1. 命名歧义

```text
❌ process_data(input: str)
✅ extract_invoice_fields(invoice_text: str)
```

`process` + `data` 是双零信息词。说清楚做什么（extract）、处理什么（invoice）。

### 2. description 只重复 name

```text
❌ name: "get_weather", description: "Get the weather"
✅ name: "get_weather", description: "Get current weather and 3-day forecast for a city. Use when user asks about weather, temperature, or whether to bring an umbrella. Returns temp in Celsius, humidity, conditions, and forecast."
```

description 重复 name 等于没写——浪费了告诉模型"何时用、返回什么"的机会。

### 3. 参数没 description

```text
❌ {"city": {"type": "string"}}
✅ {"city": {"type": "string", "description": "City name in English, e.g. 'San Francisco', 'Tokyo'. For Chinese cities use Pinyin like 'Beijing'."}}
```

模型不知道你期望什么格式——填中文还是英文？带省份吗？

### 4. enum 该用却用 string

```text
❌ {"priority": {"type": "string"}}  # 模型会填 "urgent" / "high" / "important" / "critical" / "asap"
✅ {"priority": {"type": "string", "enum": ["low", "medium", "high"], "description": "Issue priority"}}
```

### 5. 时间/日期没格式约束

```text
❌ {"date": {"type": "string", "description": "Date"}}  # 模型填 "2026-06-01" / "Jun 1, 2026" / "tomorrow" / "06/01/2026"
✅ {"date": {"type": "string", "format": "date", "description": "Date in ISO 8601 format YYYY-MM-DD, e.g. '2026-06-01'"}}
```

### 6. 隐含约束不写

```text
❌ {"image_url": {"type": "string"}}
✅ {"image_url": {"type": "string", "description": "Publicly accessible HTTPS URL. Must be JPG/PNG/WebP, max 10MB. Local file paths or data URLs are not supported."}}
```

你的后端有约束，但模型不知道——它会传 file:// 或 data: URL 然后 100% 失败。

### 7. 副作用工具不警告

```text
❌ name: "delete_user", description: "Delete a user"
✅ name: "delete_user", description: "PERMANENTLY delete a user account and all associated data. This action is IRREVERSIBLE. Ask the user to confirm before calling. Do not call this for temporary deactivation—use deactivate_user instead."
```

模型不会"小心"，除非你明确告诉它"这是不可逆操作"。

### 8. 工具粒度过粗（一个工具干太多事）

```text
❌ manage_calendar(action: str, ...)  # action="create"/"update"/"delete"/"list"
✅ 拆成 4 个：create_event / update_event / delete_event / list_events
```

"动作分发"工具让模型先猜 action 再填参数——双重决策，错误率叠加。拆开后每个工具自带语义。

### 9. 工具粒度过细（一个动作拆成 N 个工具）

```text
❌ get_user_name / get_user_email / get_user_phone / get_user_address / get_user_birthday ...
✅ get_user_profile(user_id, fields=["name", "email", ...])
```

每个字段一个工具会让工具列表爆炸，模型在选择时被淹没。

### 10. description 写实现细节

```text
❌ "Uses Redis cache with 60s TTL, falls back to PostgreSQL"
✅ "Returns the user's current subscription plan. Data is near-real-time (may be up to 60s stale)."
```

模型不关心你用 Redis 还是 PostgreSQL——它关心"返回的数据有多新"。

### 11. 返回值是裸字符串拼接

```text
❌ "User john@example.com has 3 orders: ord_001, ord_002, ord_003"
✅ {"user_email": "john@example.com", "orders": [{"id": "ord_001"}, ...]}
```

裸字符串让模型必须做文本解析才能引用字段，错误率高且消耗推理算力。

### 12. 必选/可选标记反了

```text
❌ create_meeting(title, start_time, attendees=[])  # attendees 可选，但实际没人不能开会
✅ create_meeting(title, start_time, attendees)  # required
```

把业务上必须的字段标成可选，模型会真的不传——然后业务方拿到空 attendees 数组发火。

---

## 实战：差 schema → 模型调错 → 好 schema → 模型调对

完整对比一个工具的"差"和"好"两个版本，看模型行为差距。

### 差 schema

```python
TOOLS_BAD = [{
    "name": "search",
    "description": "Search",
    "input_schema": {
        "type": "object",
        "properties": {
            "q": {"type": "string"},
            "type": {"type": "string"},
            "n": {"type": "integer"}
        },
        "required": ["q"]
    }
}]

# 用户问："找一下上个月关于 Q2 OKR 的会议纪要"
# 模型可能的调用（多次运行结果不稳定）：
# 1. search(q="Q2 OKR 会议纪要")  # type 没填，n 没填
# 2. search(q="上个月 Q2 OKR", type="meeting", n=10)  # type="meeting" 是猜的
# 3. search(q="OKR", type="document")  # query 太宽
# 4. search(q="Q2 OKR meeting notes last month", type="notes")  # 猜了 type="notes"
```

后端真实期望：`type` 必须是 `["doc", "wiki", "chat", "email"]` 之一，`q` 应该是关键词而非自然语言句子，`n` 默认 10，最大 50。模型完全不知道这些约束。

### 好 schema

```python
TOOLS_GOOD = [{
    "name": "search_workspace",
    "description": (
        "Search across the user's workspace content (documents, wiki pages, "
        "chat messages, emails). Use this when the user wants to find specific "
        "content they or their team created.\n\n"
        "Use when:\n"
        "- User asks 'find', 'search', 'where is', 'show me' about workspace content\n"
        "- User references something they remember but doesn't know the exact location\n\n"
        "Don't use for:\n"
        "- General web search (use search_web)\n"
        "- Real-time data like calendar events (use list_calendar_events)\n"
        "- Looking up specific documents by ID (use get_document)\n\n"
        "Returns up to 20 results ranked by relevance, each with id, type, title, "
        "snippet, and last_modified date."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": (
                    "Search keywords. Use specific terms, not full sentences. "
                    "E.g. 'Q2 OKR' not 'find documents about Q2 OKRs from last month'. "
                    "Date filters should go in date_range, not query."
                )
            },
            "content_type": {
                "type": "string",
                "enum": ["doc", "wiki", "chat", "email", "all"],
                "default": "all",
                "description": (
                    "Filter by content type. 'doc' = Google Docs/Notion pages, "
                    "'wiki' = team wiki articles, 'chat' = Slack/Teams messages, "
                    "'email' = email threads, 'all' = search everything."
                )
            },
            "date_range": {
                "type": "string",
                "enum": ["today", "last_7_days", "last_30_days", "last_90_days", "all_time"],
                "default": "last_30_days",
                "description": "Time window to search within."
            },
            "limit": {
                "type": "integer",
                "minimum": 1,
                "maximum": 50,
                "default": 20,
                "description": "Max results to return. Default 20, max 50."
            }
        },
        "required": ["query"]
    }
}]

# 同样的用户问题："找一下上个月关于 Q2 OKR 的会议纪要"
# 模型现在的调用（多次运行结果稳定）：
# search_workspace(
#     query="Q2 OKR meeting notes",
#     content_type="doc",          # 知道纪要属于 doc
#     date_range="last_30_days",   # "上个月" 映射到合法 enum
#     limit=20                     # 用默认值
# )
```

差距来自哪：
- **name 明确**："search_workspace" 让模型知道这是工作区内容（vs `search` 可能是任何搜索）
- **场景边界明确**：description 说了"何时不用"，模型不会把它和 search_web 混
- **enum 锁定值**：content_type 和 date_range 用 enum，模型不会乱编 "notes" / "last month"
- **query 格式提示**：明确说"用关键词不用完整句子"，避免模型把"上个月的"塞进 query
- **默认值清楚**：模型知道 limit 默认 20，可以省略

**这套差距在真实生产里是 30%+ vs 90%+ 的调用成功率差距**——同一个模型，schema 一改，质量天差地别。

---

## OpenAI vs Anthropic：schema 差异速查

跨厂商部署时常踩的坑——两家在 tool schema 上有不可忽略的差异。

| 维度 | OpenAI | Anthropic |
|---|---|---|
| **顶层字段名** | `function.name` / `function.description` / `function.parameters` | `name` / `description` / `input_schema` |
| **description 长度限制** | 1024 字符 | 无硬上限（建议合理） |
| **JSON Schema 子集** | 支持子集 + Strict mode 时更严 | 支持较完整的 JSON Schema Draft 2020-12 |
| **`oneOf` / `anyOf` / `allOf`** | Strict mode 下**不支持** | 支持 |
| **`additionalProperties: false`** | Strict mode 下**必须显式写** | 推荐写但不强制 |
| **`required` 数组** | Strict mode 下**所有字段都要 required** | 按实际需求 |
| **递归 / `$ref`** | Strict mode 下不支持 | 支持 |
| **enum 值数量** | 建议 ≤ 500 | 建议合理（同样越少越好） |

**实战影响**：

```python
# Anthropic 这个 schema 直接用没问题
{
  "input_schema": {
    "type": "object",
    "properties": {
      "filter": {
        "oneOf": [
          {"type": "string"},
          {"type": "object", "properties": {...}}
        ]
      }
    }
  }
}

# 同样的 schema 给 OpenAI Strict mode 会被拒
# 必须改写成 union via enum + discriminator 或彻底拆成两个工具
```

**跨厂商兼容策略**：
1. **以最严格的（OpenAI Strict）为基线**——不用 oneOf / anyOf / 复杂引用，schema 在两家都能跑
2. **按厂商分离 schema 版本**——同一个工具维护两份 schema，在适配层根据 provider 选用
3. **用 schema 生成库**（pydantic、zod）+ 适配器——一份源、多种输出

详见 [function calling 规范](./function-calling) 对协议层差异的展开。

---

## 什么时候拆工具、什么时候合并

工具粒度是 schema 设计里最高维度的决策。

### 偏向拆分的信号

- 描述里出现 "if action is X, parameter Y is required"——这是分发逻辑，应该是不同的工具
- 一个工具的 description 超过 200 字才能说清楚——通常意味着它在做多件事
- 参数有"互斥组"（A 和 B 必须二选一）——拆成两个工具天然解决
- 模型反复在同一工具的不同参数组合上犯错——说明工具内部太复杂

### 偏向合并的信号

- 多个工具的 description 几乎一样，只是参数不同——可能合并成一个参数化工具更清楚
- 工具列表已经超过 20 个，每个都很简单——选择空间太大，模型选错
- 几个工具总是被一起调用（A 之后必调 B）——也许应该合并成一个原子动作

### Anthropic 的经验数据

Anthropic 在 [tool use guide](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview) 和多篇博客里反复提到：

> *"It's generally better to have a small number of well-described tools than many overlapping ones. We typically see best performance with 5-15 distinct tools."*

5-15 是个软上限。超过 30 个工具时，你需要**工具检索/筛选层**——先用 embedding 把当前用户意图最相关的 8-10 个工具挑出来，只把这些放进 prompt。否则 context 里塞 50 个工具的 schema，模型会被严重干扰。

---

## 常见陷阱

### 陷阱 1：description 写"做什么"不写"什么时候用"

**现象**：description 完美描述了工具行为，但模型该调它时不调、不该调时乱调。

**根因**：模型用 description 的两个时机不同——(1) **选哪个工具**：靠"何时用"；(2) **怎么填参数**：靠"做什么"。只写后者，前者的决策完全靠模型瞎猜。

**修法**：description 必须包含"何时使用"和"何时不使用"——前者帮模型选中你这个工具，后者帮它避开你的工具。两者缺一不可。

### 陷阱 2：参数 description 假设上下文

**现象**：参数说明里写"the ID"——什么 ID？user ID？order ID？session ID？模型在多工具场景下混乱。

**根因**：你写的时候脑子里有上下文（"这是 get_user 当然是 user ID"），但模型看到的是脱离上下文的字段名。

**修法**：参数 description 永远写**全称**——"The customer's user_id (UUID v4 format)"，不要写 "user ID" 或 "the ID"。重名字段在不同工具里要区分清楚。

### 陷阱 3：用模型不熟悉的术语

**现象**：description 里用了你公司内部的术语（"PSI score"、"BWA cycle"），模型完全不知道这指什么。

**根因**：模型见过的是通用语料，没见过你内部的 jargon。

**修法**：description 用通用术语，内部术语首次出现时给定义。"Find the customer's PSI score (Product Satisfaction Index, ranges 0-100)"。

### 陷阱 4：默认值在文档里说但 schema 里没声明

**现象**：你团队的 wiki 说 "limit 默认 10"，但 schema 里只写 `{"type": "integer"}`。模型不读你的 wiki——它只看 schema。结果模型乱填或不填。

**根因**：模型唯一的信息源就是 schema。任何 schema 里没出现的约定，对模型都不存在。

**修法**：所有约定（默认值、范围、格式、合法值）必须写进 schema 的 description 或专用字段（default、minimum、enum）。**Schema 是 source of truth**。

### 陷阱 5：返回值结构在工具间不一致

**现象**：`get_order` 返回 `{"order": {...}}`，`get_user` 返回 `{...}`（裸对象），`search_orders` 返回 `[...]`（裸数组）。模型在多步调用里频繁出错。

**根因**：模型在串联工具时假设它们行为一致——如果不一致，每一步都要重新理解返回结构。

**修法**：**整个工具集采用统一的返回值约定**。比如所有工具都返回 `{"data": ..., "error": null}` 或 `{"summary": "...", "result": ...}`。一致性比"最优"更重要。

### 陷阱 6：热更新 schema 把跑着的对话搞崩

**现象**：你改了 `search_workspace` 的参数（删了一个旧参数），刚好有用户的对话正在进行——下一轮模型还按旧 schema 调用，传了已删除的参数，工具崩了。

**根因**：tool schema 是被序列化进 system prompt 的——同一对话内，模型已经"看过"旧 schema 并按旧规则调用了好几轮。突然换 schema 会让模型的预期和后端不匹配。

**修法**：
- **schema 改动遵循版本化**：新增字段（可选）随时上；删除/重命名字段必须经过 deprecation 期；类型变更等同于 breaking change
- **正在进行的对话保持旧 schema** 到对话结束（用 session-level 的 schema 版本绑定）
- **breaking change 走灰度**：新 schema 只对新对话生效，老对话用老版本，监控旧版本流量自然下降到 0 再下线

更广泛的 prompt cache 与版本影响见 [会话历史管理](../context/history) 的 cache 章节。

---

## 怎么 debug "模型调错"

收到 bug 反馈"模型调错工具/填错参数"时，按下面步骤分层归因——**80% 的"模型问题"其实是 schema 问题**。

### Step 1：复现并打印实际 schema

```python
# 把真正发给模型的 tools 数组完整打印
import json
print(json.dumps(client.tools, indent=2, ensure_ascii=False))
```

很多时候你以为发出去的 schema 和实际不一样——adapter 层、序列化 bug、缓存等都会让"代码里写的"和"模型看到的"差很多。

### Step 2：脱离上下文盲读 schema

把打印出的 schema 给一个**完全不了解你业务的同事**看，问 ta：
- 这个工具是干啥的？
- 用户问 "{真实问题}" 时该调哪个工具？
- `status` 应该填什么值？

如果同事也说不清楚，那是 schema 问题——模型也说不清楚。

### Step 3：看 enum 和约束

模型乱填的参数，schema 里有没有：
- enum？没有的话补上合法值列表
- format / minimum / maximum？没有的话加约束
- description 里有没有举例？没有的话补 "e.g. ..."

### Step 4：看工具选择错

模型选错工具（该调 A 调了 B），看：
- A 和 B 的 description 是不是相似到难以区分？
- A 的 description 里有没有写"不要在 X 场景用我"？
- 工具数量是不是过多（> 20）？

### Step 5：实在是模型问题

走完前 4 步还不行，才考虑是模型能力问题：
- 换更强的模型试试（gpt-4o-mini → gpt-4o，claude haiku → sonnet）
- 看 system prompt 是不是有干扰指令
- 在 prompt 里加 few-shot 示例（"For example, when user asks X, call tool Y with..."）

**经验**：debug 100 个工具调用问题，90 个最后是改 schema 解决，10 个是真模型问题。先别怪模型。

---

## 面试题深度解析

### Q: 模型为什么会调错工具？怎么 debug 是模型问题还是 schema 问题？

**30 秒版本**：模型选工具完全靠 schema 里的文本——name、description、参数说明。错误来源主要四类：(1) **name 含糊**让多个工具看起来都能选；(2) **description 没写边界**（"何时不用"），模型不知道该选哪个；(3) **参数没 enum / 没默认值**，模型只能猜值；(4) **才是真模型能力问题**——前三类排除后才考虑。Debug 流程：打印实际发给模型的 schema → 找个不懂业务的同事盲读 → 看 ta 能不能正确选工具/填参数。同事说不清楚，说明 schema 信息不够，不是模型笨。

**追问**：那怎么量化 schema 质量？
两个指标：(1) **工具选择准确率**——同一类用户意图下，模型选对工具的比例。基线测试用 50-100 个真实意图样例，跑评测集；(2) **参数填充准确率**——给定模型选对了工具的情况下，参数填得是否合法（通过后端 schema 验证）。这两个指标拆开看，能精确定位是"选错了"还是"选对了但填错了"——前者要改 description，后者要改参数约束。

**追问**：为什么不直接让模型读你的代码或后端文档？
两个原因：(1) **成本**——代码/文档动辄上千 token，每次调用都塞进 prompt 太贵；(2) **噪声**——代码里有实现细节、注释、变量名缩写等模型不需要的信息，反而干扰判断。Schema 是一种**针对 LLM 决策优化过的、压缩到必要信息的协议**——这是它和 docstring 的根本区别。docstring 给开发者读，schema 给 LLM 读。

### Q: tool description 多长合适？

**30 秒版本**：取决于工具数量和混淆度。工具少（< 5）+ 场景明显，1-2 句就够；工具中等（5-15）+ 有相似工具需要区分，3-5 句必要；工具多（15+），description 要详细写"何时用 / 何时不用 / 和哪些工具区分"，单个工具 100-300 字英文是常态。**判据不是字数而是信息密度**——每句话都在帮模型做决策吗？如果某句话只是重复 name 或描述实现细节（"内部用了 Redis"），删掉。OpenAI 单个 description 上限是 1024 字符——逼近这个上限通常说明工具粒度太粗，应该拆。

**追问**：那 description 长会影响 token 成本吗？
会，但远小于"错调一次工具"的成本。一个工具 description 写 200 字 vs 50 字差不多 150 token，整个 tools 数组每次请求多几 KB；但模型错调一次工具 → 浪费一轮对话 → 模型多调一次纠正 → 用户体验差。**用 token 换调用准确率几乎永远划算**。例外是工具列表已经爆炸（30+ 工具）的情况——这时候应该上工具检索层，按当前意图只塞 5-10 个工具进 prompt。

**追问**：description 用中文还是英文？
看模型主要被训练的语言。Claude / GPT 都在英文语料上训练量最大，英文 description 通常稳定性最好。**实测**：同一个工具的英文 description 比中文版本调用准确率高 5-10%，尤其是在涉及 enum、格式等细节场景。但如果你的用户提问都是中文，工具 description 用中文也能 work——只是稳定性略低。**生产建议**：核心工具集用英文 description，参数 description 可以加中文示例。

### Q: schema 改了能热更新吗？

**30 秒版本**：可以，但要分类讨论。**向后兼容的改动**（加新字段，且字段可选）随时热更新没问题；**broken 改动**（删字段、改字段类型、重命名、改 enum 合法值）热更新会让正在进行的对话出错——因为模型已经按旧 schema 在 history 里调用过几次了，会维持旧的预期。**生产做法**：(1) 用 schema 版本号；(2) 同一 session 锁定 schema 版本，新对话才用新 schema；(3) broken 改动走灰度，监控旧版本流量降到 0 再下线；(4) 改 schema 会让 prompt cache 全失效，要算账。

**追问**：那如果工具的后端逻辑要紧急修复呢？
区分**接口（schema）和实现**。后端逻辑修复不动 schema 的话，热更新无影响——schema 没变，模型行为不变，只是后端处理变正确了。**铁律**：紧急修复永远改实现，schema 改动慢慢走流程。如果实现修复必须配 schema 改动（比如要加一个新参数才能修），那就当 broken change 走灰度。

**追问**：MCP 这种动态发现工具的协议下，schema 改了会怎样？
MCP 客户端通常会在 session 开始时 list_tools 一次拿到当前 schema，session 内沿用。服务端中途改 schema 不会影响进行中的 session——下次连接才拿新版。这其实是更干净的隔离。但**注意**：MCP 服务端要避免在 session 内频繁改 schema（除非协议显式支持 schema change notification）——否则同一 session 内不同请求看到的工具集不一致，会让上层 Agent 出诡异 bug。详见 [MCP 协议](./mcp)。

### Q: 给你 20 个工具的 schema，让模型选——怎么排序、怎么裁剪？

**30 秒版本**：20 个还在模型能正常处理的范围（GPT-4 / Claude 3.5+ 的注意力够），但要做两件事：(1) **排序**——把最可能被调用的工具放前面（模型对 schema 列表前段记忆更好，类似 Lost in the Middle）；(2) **description 内强调互斥**——尤其是相似工具间，每个 description 都明确"和工具 X 的区别是 Y"。**超过 30 个工具就必须上工具检索层**——把用户最新消息 embedding 化，从工具池里检索 top-K（K=5-10）相关工具，只把这些塞进 prompt。Claude Code、Cursor 这类有几十个 tool 的 Agent 内部都做了这层。

**追问**：那工具检索本身怎么做？
工具描述向量化（用 OpenAI text-embedding-3-small 或 bge-m3 这类便宜模型），存进向量库。每轮收到用户消息时：(1) 嵌入 user message；(2) 检索 top-10 相关工具；(3) 加上"常用必备工具"（如 search、ask_user）；(4) 拼成本轮的 tools 数组。难点是**召回率**——用户说"帮我看下我那个项目"，要召回 search_projects 但 schema 描述里没有"我那个"这种代词。解法：用工具的"典型 query 例子"做 embedding 而不是 description 本身——例子比定义更接近用户实际表达。

**追问**：检索层会引入延迟，怎么权衡？
embedding + 检索通常 50-100ms。**对比收益**：如果不检索，30 个工具的 schema 在 prompt 里多 5-10K token，prefill 多花几百毫秒、单次调用贵几分钱、模型选择质量下降——总开销远大于 100ms 检索。**生产经验**：> 15 个工具就值得上检索层；< 10 个工具直接全塞。中间地带按性能 / 成本 / 准确率三维实测。

---

## 延伸阅读

- **Anthropic 文档：Tool Use Overview** ([docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview))
  Anthropic 官方对 tool description 重要性的强调——"the most important factor in Claude's tool use performance is the quality of your tool descriptions"。把这句话读 10 遍。

- **Anthropic 文档：Implement Tool Use** ([docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use))
  完整的 tool schema 编写规范，包括 description 结构、参数描述要点、错误处理建议。生产前必读。

- **OpenAI Cookbook：Function Calling with an OpenAPI Spec** ([cookbook.openai.com/examples/function_calling_with_an_openapi_spec](https://cookbook.openai.com/examples/function_calling_with_an_openapi_spec))
  OpenAI 官方关于 function calling 的实战示例，特别是 Strict mode 下的 schema 约束差异。跨厂商部署必看。

- **OpenAI 文档：Function Calling Guide** ([platform.openai.com/docs/guides/function-calling](https://platform.openai.com/docs/guides/function-calling))
  function name / description 长度上限、Strict mode 的 schema 子集限制、并行调用规则。OpenAI 侧的硬约束都在这里。

- **JSON Schema 官方文档** ([json-schema.org/learn/getting-started-step-by-step](https://json-schema.org/learn/getting-started-step-by-step))
  enum、format、minimum/maximum、oneOf/anyOf 的标准语义。OpenAI / Anthropic 都基于 JSON Schema，不熟这个工具就只能瞎写。

- **博客：Eugene Yan — Patterns for Building LLM-based Systems** ([eugeneyan.com/writing/llm-patterns](https://eugeneyan.com/writing/llm-patterns/))
  工程化视角看 LLM 应用，含 tool 设计的若干 pattern。读"Defensive UX"和"Guardrails"段落对工具 schema 的鲁棒性设计帮助大。

- **MCP 规范：Tool Definition** ([modelcontextprotocol.io/specification/server/tools](https://modelcontextprotocol.io/specification/server/tools))
  MCP 协议层对 tool schema 的要求。本文是协议无关的设计原则，MCP 是其中一种具体协议——理解协议怎么定义"工具"对设计自己的工具有帮助。

- **配套阅读**：
  - [function calling 规范](./function-calling) — schema 在调用协议里怎么被使用、tool_call / tool_result 流转
  - [自定义工具实现](./custom-tools) — 从 schema 设计到代码实现到部署的端到端实战
  - [工具错误处理](./error-handling) — 错误返回的具体结构和模型理解策略
  - [MCP 协议](./mcp) — schema 在跨进程协议下的额外约束（如 JSON-RPC、动态发现）
  - [Prompt 基础](../prompt/basics) — "清晰描述"原则在 system prompt 和 tool description 是相通的
  - [会话历史管理](../context/history) — schema 改动对 prompt cache 的影响、版本控制策略
