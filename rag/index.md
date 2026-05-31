# RAG 检索增强生成

RAG 是大模型落地企业知识库、私有数据问答的标准范式。本章从Naive RAG 到 Agentic RAG 全覆盖。

## 本章内容

- [Naive RAG 与瓶颈](./basics) — 索引、检索、生成三段式与已知问题
- [文档切分策略](./chunking) — 固定 / 语义 / 递归 / 延迟切分
- [嵌入模型选型](./embedding-models) — BGE、E5、OpenAI、Voyage、Cohere 实测
- [向量数据库对比](./vector-db) — Pinecone、Weaviate、Qdrant、Milvus、Chroma、pgvector
- [混合检索](./hybrid-search) — BM25 + 向量融合方案与 RRF
- [重排序](./reranking) — 交叉编码器、Cohere Rerank、BGE-Reranker
- [高级 RAG](./advanced) — HyDE、Step-back、Self-RAG、Corrective RAG
- [GraphRAG 图增强检索](./graphrag) — Microsoft 图增强检索方案深度剖析
- [Agentic RAG](./agentic-rag) — 把检索当工具的 Agent 模式
- [RAG 评估方法](./evaluation) — RAGAS、TruLens、DeepEval 实战

## 学习路径

1. 先建立 **Naive RAG** 的端到端理解（从文档到答案的完整链路）
2. 重点优化两个组件：**切分策略** 和 **嵌入模型**
3. 进入生产必加 **混合检索 + 重排序**，召回率立刻起飞
4. 进阶看 **高级 RAG / GraphRAG / Agentic RAG**，按场景选用
5. 上线前一定要做 **RAG 评估**，不能凭感觉
