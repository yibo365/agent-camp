# Codex for every role, tool, and workflow

- 原文标题：Codex for every role, tool, and workflow
- 原文链接：https://openai.com/index/codex-for-every-role-tool-workflow/
- 发布时间：2026-06-02
- 来源：OpenAI Product
- 主题：Codex、role-specific plugins、Sites、annotations、非开发者工作流

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

这篇文章展示了 Codex 从“开发工具”走向“跨岗位工作 Agent”的产品路线。OpenAI 的核心动作不是只增强编码能力，而是让 Codex 通过 role-specific plugins、Sites 和 annotations 适配不同团队的工具、上下文和产出形态。

如果说早期 Codex 解决的是“工程师如何更快写代码”，这篇文章讨论的是“分析师、销售、设计师、投资人、银行家如何把自己的工作交给 Agent”。

## 核心内容

- Codex 每周使用人数超过 500 万。
- 非开发者约占 Codex 总用户的 20%，增速超过开发者 3 倍。
- OpenAI 发布 6 个 role-specific plugins，覆盖数据分析、创意生产、销售、产品设计、公开股权投资和投行业务。
- 这些插件合计集成 62 个常用应用和 110 个 skills。
- 插件把 apps、skills、instructions、workflows 打包，让 Codex 更贴近岗位工作方式。
- OpenAI 还发布 annotations，用来在结果上就地反馈和修改；并预览 Sites，让团队可以把交互式网站和应用用 URL 共享给 workspace。

## 深度精读

这篇文章的关键不是“又多了几个插件”，而是 Codex 的抽象从 tool 调用上升到了 **role bundle**。

普通 Agent 工具系统关注的是“有哪些工具可用”。Role-specific plugin 关注的是“某个岗位完成一类工作需要哪些工具、数据、指令、技能和输出格式”。这两者差很多。

以数据分析插件为例，用户真正需要的不是一个 Snowflake tool 或 Tableau tool，而是一条从业务问题到数据查询、解释变化、生成报告和 dashboard 的工作流。以投行插件为例，价值也不在单个数据源，而在 research、diligence、comps、pitch materials 这些流程被打包成可执行模板。

这说明 Agent 产品正在靠近一种新形态：**工作流封装 + 工具生态 + 领域技能包**。它和 Anthropic 的 Agent Skills、金融 Agent 模板很接近：不是让用户从零拼 prompt，而是把岗位经验产品化。

## 学习时重点看什么

- 看 role-specific plugins：它把工具、技能、说明和流程一起打包。
- 看非开发者增长：Codex 已经不只是 IDE 辅助，而是跨职能执行工具。
- 看 Sites：Agent 输出不再局限于文本和 diff，可以变成可共享应用。
- 看 annotations：结果反馈需要直接落在产物上，而不是回到聊天框里重新描述。

## 工程启发

如果你要做企业 Agent 平台，这篇文章给出一个很实用的封装方式：

| 封装层 | 例子 | 解决的问题 |
|---|---|---|
| Tool | Snowflake、Salesforce、Figma、PitchBook | 连接外部系统 |
| Skill | 如何分析指标、如何准备 pitchbook | 注入岗位方法论 |
| Workflow | 从问题到报告、从线索到跟进 | 固化任务步骤 |
| Role Plugin | Data analytics、Sales、Product design | 面向岗位交付完整能力包 |
| Site / Artifact | dashboard、prototype、campaign board | 让 Agent 输出可共享、可继续协作 |

这也解释了为什么单纯“接 MCP server”不够。MCP 解决连接，role plugin 解决“连接之后怎么完成工作”。企业真正买单的是后者。

## 和本站章节的关系

- [Agent Skills](../../agent/skills)：role plugin 可以看作 skills + tools + workflows 的产品化包。
- [自定义工具开发](../../tools/custom-tools)：工具要服务于岗位任务，而不是为了暴露 API 而暴露。
- [Agent Runtime](../../engineering/agent-runtime)：跨岗位插件需要统一权限、上下文、审计和评估。
- [垂直领域 Agent](../../vertical/)：这篇是 vertical agent 产品化的直接参考。
- [MCP Server 生产化](../../tools/mcp-production)：插件里的工具生态需要认证、版本、权限和观测。

## 面试追问

- Role-specific plugin 和普通工具集合有什么区别？
- 为什么非开发者使用 Codex 增长更快是一个重要信号？
- Agent 输出从文本变成 Site / artifact 后，评估方式会怎么变？
- 如果你给客服或财务设计 role plugin，会打包哪些 tools、skills 和 workflows？
