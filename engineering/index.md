# Agent 工程化

从 Demo 到生产，中间隔着评估、监控、成本、安全四座大山。本章覆盖 Agent 生产落地的全部工程问题。

## 本章内容

- [评估体系](./evaluation) — SWE-bench、GAIA、AgentBench、τ-bench、MMAU
- [用模型评估模型](./llm-judge) — 用大模型作为评审的最佳实践与陷阱
- [可观测性](./observability) — LangSmith、Langfuse、Arize Phoenix、Helicone
- [Agent 线上质量治理面试深挖](./agent-quality-interview) — trace、自动裁判、badcase 归因与回归集
- [Agent 业务效果与 ROI 面试深挖](./business-roi-interview) — 任务完成、自动化率、转人工、重复咨询和单次成功成本
- [Agent Harness 设计](./harness) — 状态、工具、权限、验证和恢复
- [Agent 确定性控制面试深挖](./deterministic-control-interview) — 代码下沉、结构化输出、verifier 和定向修复
- [从业务 Agent 到 Agent Runtime](./agent-runtime) — 生产级业务 Agent 的六个运行时平面
- [Agent Runtime 面试深挖](./agent-runtime-interview) — 匿名真实面经里的平台/引擎追问链
- [Loop Engineering 循环工程](./loop-engineering) — 调度、并行 worktree、持久状态、maker/checker
- [AI Coding SDLC 面试深挖](./ai-coding-sdlc-interview) — PRD、技术方案、任务拆解、TDD、review gate 与研发指标
- [成本优化](./cost-optimization) — 提示词缓存、模型路由、蒸馏、批处理
- [安全](./security) — 提示词注入、越狱、护栏、敏感信息脱敏
- [限流与降级](./rate-limiting) — 速率限制、降级、熔断、退避重试
- [Agent 高可用与容灾面试深挖](./reliability-interview) — RTO/RPO、依赖分级、降级模式、演练和事故复盘

## 学习路径

1. **评估体系** 是工程化第一步：没有评估就没有迭代
2. **可观测性** 紧随其后，没有调用链等于在黑盒里抓瞎
3. 准备上线效果追问时先看 **Agent 业务效果与 ROI 面试深挖**，再看 **Agent 线上质量治理面试深挖**，把业务 outcome、trace、eval、badcase 和回归集串起来
4. 做长周期任务前补 **Harness 设计**，遇到“模型漏段、算错、JSON 不稳”这类追问时补 **Agent 确定性控制面试深挖**；如果要把单个业务 Agent 抽成可复用平台，再看 **Agent Runtime**；准备平台/引擎岗位时接着看 **Agent Runtime 面试深挖**；想让 Agent 无人值守地自己跑，再上 **Loop Engineering**（harness 的上一层）
5. 准备 AI Coding / 研发效能方向时看 **AI Coding SDLC 面试深挖**，把个人工具使用升级成团队流程和质量门禁
6. 上线后两条主线并行优化：**成本** 与 **安全**
7. 高并发场景必读 **限流降级**；准备负责人/架构面时补 **Agent 高可用与容灾面试深挖**
