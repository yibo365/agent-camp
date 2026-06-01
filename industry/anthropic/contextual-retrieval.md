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
