# Agent 工程化

从 Demo 到生产，中间隔着评估、监控、成本、安全四座大山。本章覆盖 Agent 生产落地的全部工程问题。

## 本章内容

- [评估体系](./evaluation) — SWE-bench、GAIA、AgentBench、τ-bench、MMAU
- [用模型评估模型](./llm-judge) — 用大模型作为评审的最佳实践与陷阱
- [可观测性](./observability) — LangSmith、Langfuse、Arize Phoenix、Helicone
- [Agent Harness 设计](./harness) — 状态、工具、权限、验证和恢复
- [成本优化](./cost-optimization) — 提示词缓存、模型路由、蒸馏、批处理
- [安全](./security) — 提示词注入、越狱、护栏、敏感信息脱敏
- [限流与降级](./rate-limiting) — 速率限制、降级、熔断、退避重试

## 学习路径

1. **评估体系** 是工程化第一步：没有评估就没有迭代
2. **可观测性** 紧随其后，没有调用链等于在黑盒里抓瞎
3. 做长周期任务前补 **Harness 设计**，否则 Agent 很容易丢状态、漂移或不可恢复
4. 上线后两条主线并行优化：**成本** 与 **安全**
5. 高并发场景必读 **限流降级**
