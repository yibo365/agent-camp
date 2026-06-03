# Tool Use & Function Calling

Tool Use 是 LLM 走向 Agent 的关键一步。本章覆盖从协议规范到生产实践的完整工具调用体系。

## 本章内容

- [函数调用规范](./function-calling) — OpenAI / Anthropic / 通用 JSON Schema
- [工具 Schema 设计](./schema-design) — 命名、描述、参数、返回值的最佳实践
- [并行工具调用](./parallel) — 并行触发与编排
- [错误处理与重试](./error-handling) — 失败模式、重试策略、降级
- [MCP 协议详解](./mcp) — 模型上下文协议架构、Server 开发、生态
- [MCP Server 生产化](./mcp-production) — 认证、权限、版本、部署、观测和安全
- [工具沙箱与权限](./sandbox) — 隔离、最小权限、危险操作确认
- [自定义工具开发](./custom-tools) — 从设计到落地的端到端实战

## 学习路径

1. 掌握 **函数调用规范**，理解 LLM 看到的工具长什么样
2. 学习 **Schema 设计**，糟糕的工具描述会让模型完全用不对
3. 重点掌握 **MCP 协议**，这是 2025 年起 Agent 工具生态的事实标准
4. MCP 真正上线前补 **MCP Server 生产化**
5. 生产部署关注 **错误处理** 与 **沙箱权限**
