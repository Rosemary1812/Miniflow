import prisma from '@/lib/db';
import { embedKnowledgeQuery, KNOWLEDGE_EMBEDDING_MODEL } from './embeddings';

export type KnowledgeRetrievalResult = {
  chunkId: string;
  documentId: string;
  knowledgeBaseId: string;
  title: string;
  content: string;
  score: number;
  metadata: unknown;
};

type RetrievalRow = {
  chunkId: string;
  documentId: string;
  knowledgeBaseId: string;
  title: string;
  content: string;
  score: number;
  metadata: unknown;
};

const toVectorLiteral = (embedding: number[]): string => {
  return `[${embedding.map(value => Number(value).toString()).join(',')}]`;
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
      SELECT
        kc."id" AS "chunkId",
        kc."documentId" AS "documentId",
        kc."knowledgeBaseId" AS "knowledgeBaseId",
        kd."title" AS "title",
        kc."content" AS "content",
        (1 - (kc."embedding" <=> $1::vector))::float AS "score",
        kc."metadata" AS "metadata"
      FROM "KnowledgeChunk" kc
      INNER JOIN "KnowledgeDocument" kd ON kd."id" = kc."documentId"
      WHERE kc."workspaceId" = $2
        AND kc."knowledgeBaseId" = ANY($3::text[])
        AND kc."embeddingModel" = $4
        AND kd."status" = 'READY'
      ORDER BY kc."embedding" <=> $1::vector
      LIMIT $5
    `,
    vector,
    workspaceId,
    knowledgeBaseIds,
    KNOWLEDGE_EMBEDDING_MODEL,
    topK,
  );

  return rows
    .map(row => ({ ...row, score: Number(row.score) }))
    .filter(row => row.score >= scoreThreshold);
};
