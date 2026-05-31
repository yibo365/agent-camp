# Prompt Engineering

Prompt 是与大模型对话的语言。本章覆盖从基础原则到高级模式的完整 Prompt 工程方法论。

## 本章内容

- [基础原则](./basics) — 清晰性、结构化、角色设定、约束注入
- [少样本学习（Few-shot）](./few-shot) — 示例驱动学习与示例选择策略
- [思维链 CoT / ToT / GoT](./cot) — 推理链、推理树、推理图
- [自一致性与自我反思](./self-consistency) — 多路径采样与自我修正
- [ReAct 模式](./react) — 推理与行动交替的核心范式
- [系统提示词设计](./system-prompt) — 角色定义、行为约束、示例注入
- [提示词模板工程化](./templates) — Jinja、LangChain PromptTemplate、版本管理
- [提示词注入攻防](./injection) — 注入攻击、越狱与防御策略
- [提示词压缩](./compression) — LLMLingua、Token 节流技巧

## 学习路径

1. 从 **基础原则** 入手，建立"清晰、具体、可验证"的提示词写作直觉
2. 掌握 **思维链 / ReAct** 这两个最重要的推理范式
3. 进入生产环境必读 **系统提示词设计** 与 **模板工程化**
4. 面向安全敏感场景必读 **注入攻防**
