# Contextual Retrieval

- 原文标题：Introducing Contextual Retrieval
- 原文链接：https://www.anthropic.com/engineering/contextual-retrieval
- 发布时间：2024-09-19
- 来源：Anthropic Engineering
- 主题：RAG、上下文增强、检索质量

> 本文是中文精读笔记，不是原文全文翻译。

## 这篇文章解决什么问题

RAG 把文档切成 chunk 后，单个 chunk 往往失去原文上下文。检索时，即使 chunk 里有答案，也可能因为语义不完整而召回失败。Contextual Retrieval 的思路是在入库前给每个 chunk 加上文档级上下文说明。

## 核心内容

- 传统 chunking 会破坏段落和文档之间的关系。
- 在每个 chunk 前补充上下文说明，可以让 embedding 和 BM25 更容易匹配真实问题。
- 这是一种“用长上下文增强 RAG”的方法，而不是简单替代 RAG。
- 质量提升来自更好的入库表示，而不只是更强的检索模型。

## 深度精读

Contextual Retrieval 解决的是 RAG 里非常常见的“chunk 失忆”问题。文档切分后，一个片段可能只包含“这个指标同比增长 12%”，但没有说明“这个指标”是什么、来自哪家公司、属于哪一年报表。向量检索看到这个 chunk 时，很难把它和用户问题准确匹配。

Anthropic 的思路是在入库前，用模型基于原文档给每个 chunk 生成简短上下文说明，再把说明和 chunk 一起进入检索索引。这样 chunk 不再是孤立片段，而是带着文档级背景。对 embedding 检索，它增强语义；对 BM25，它增加关键字；对后续生成，它减少模型猜上下文的压力。

这个方法的工程关键在“短而准”。上下文说明太长会增加成本和噪声；说明不准确会把幻觉写进索引，之后每次检索都会放大错误。因此它适合高价值文档库，需要配合批处理、缓存、抽检和回滚。

## 学习时重点看什么

- RAG 质量不只取决于检索算法，也取决于入库表示。
- Contextual Retrieval 是在 chunk 前补上下文，不是把整篇文档都塞给模型。
- 生成上下文说明时要控制成本、长度和幻觉。

## 工程启发

- RAG 优化不能只调向量数据库参数，要关注文档入库前的表示质量。
- chunk 的上下文说明应当短、准确、稳定，避免引入幻觉。
- Contextual Retrieval 适合长文档、专业文档和上下文依赖强的知识库。

## 和本站章节的关系

- [RAG 基础](../../rag/basics)
- [文档切分策略](../../rag/chunking)
- [混合检索](../../rag/hybrid-search)
- [高级 RAG](../../rag/advanced)

## 面试追问

- 为什么 chunk 切分会损失语义？
- Contextual Retrieval 和 reranking 解决的问题有什么不同？
- 给 chunk 生成上下文说明时如何控制成本和幻觉？
