import prisma from '@/lib/db';
import { embedKnowledgeQuery, KNOWLEDGE_EMBEDDING_MODEL } from './embeddings';

export type KnowledgeRetrievalResult = {
  chunkId: string;
  documentId: string;
  knowledgeBaseId: string;
  title: string;
  content: string;
  score: number;
  vectorScore: number;
  keywordScore: number;
  metadata: unknown;
};

type RetrievalRow = {
  chunkId: string;
  documentId: string;
  knowledgeBaseId: string;
  title: string;
  content: string;
  score: number;
  vectorScore: number;
  keywordScore: number;
  metadata: unknown;
};

const toVectorLiteral = (embedding: number[]): string => {
  return `[${embedding.map(value => value.toString()).join(',')}]`;
};

export const retrieveKnowledge = async ({
  workspaceId,
  knowledgeBaseIds,
  query,
  topK = 5,
  scoreThreshold = 0.25,
}: {
  workspaceId: string;
  knowledgeBaseIds: string[];
  query: string;
  topK?: number;
  scoreThreshold?: number;
}): Promise<KnowledgeRetrievalResult[]> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || knowledgeBaseIds.length === 0) {
    return [];
  }

  const embedding = await embedKnowledgeQuery({ workspaceId, query: trimmedQuery });
  const vector = toVectorLiteral(embedding);
  const rows = await prisma.$queryRawUnsafe<RetrievalRow[]>(
    `
      WITH query_input AS (
        SELECT
          $1::vector AS embedding,
          plainto_tsquery('simple', $6) AS keyword_query
      )
      SELECT
        kc."id" AS "chunkId",
        kc."documentId" AS "documentId",
        kc."knowledgeBaseId" AS "knowledgeBaseId",
        kd."title" AS "title",
        kc."content" AS "content",
        (1 - (kc."embedding" <=> query_input.embedding))::float AS "vectorScore",
        LEAST(
          ts_rank_cd(to_tsvector('simple', kc."content"), query_input.keyword_query) * 8,
          1
        )::float AS "keywordScore",
        (
          (1 - (kc."embedding" <=> query_input.embedding)) * 0.75 +
          LEAST(ts_rank_cd(to_tsvector('simple', kc."content"), query_input.keyword_query) * 8, 1) * 0.25
        )::float AS "score",
        kc."metadata" AS "metadata"
      FROM "KnowledgeChunk" kc
      CROSS JOIN query_input
      INNER JOIN "KnowledgeDocument" kd ON kd."id" = kc."documentId"
      WHERE kc."workspaceId" = $2
        AND kc."knowledgeBaseId" = ANY($3::text[])
        AND kc."embeddingModel" = $4
        AND kd."status" = 'READY'
      ORDER BY "score" DESC
      LIMIT $5
    `,
    vector,
    workspaceId,
    knowledgeBaseIds,
    KNOWLEDGE_EMBEDDING_MODEL,
    topK,
    trimmedQuery,
  );

  return rows
    .map(row => ({
      ...row,
      score: row.score,
      vectorScore: row.vectorScore,
      keywordScore: row.keywordScore,
    }))
    .filter(row => row.score >= scoreThreshold);
};
