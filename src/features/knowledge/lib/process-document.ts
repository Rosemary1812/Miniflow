import { createId } from '@paralleldrive/cuid2';
import { EmbeddingProvider, KnowledgeDocumentStatus } from '@prisma/client';
import prisma from '@/lib/db';
import { embedKnowledgeTexts, KNOWLEDGE_EMBEDDING_MODEL } from './embeddings';
import { parseKnowledgeDocument } from './document-parsers';

const toVectorLiteral = (embedding: number[]): string => {
  return `[${embedding.map(value => value.toString()).join(',')}]`;
};

export const processKnowledgeDocument = async (documentId: string) => {
  const document = await prisma.knowledgeDocument.findUnique({
    where: { id: documentId },
    include: { knowledgeBase: true },
  });

  if (!document) {
    throw new Error(`Knowledge document ${documentId} not found`);
  }

  await prisma.knowledgeDocument.update({
    where: { id: document.id },
    data: {
      status: KnowledgeDocumentStatus.PROCESSING,
      error: null,
      processedAt: null,
    },
  });

  try {
    const parsedDocument = await parseKnowledgeDocument({
      sourceType: document.sourceType,
      sourceText: document.sourceText,
      sourceData: document.sourceData,
    });
    const chunks = parsedDocument.chunks;
    if (chunks.length === 0) {
      throw new Error('Document text is empty after cleaning');
    }

    const embeddings = await embedKnowledgeTexts({
      workspaceId: document.workspaceId,
      texts: chunks.map(chunk => chunk.content),
    });

    await prisma.$transaction(async tx => {
      await tx.knowledgeChunk.deleteMany({ where: { documentId: document.id } });

      for (const chunk of chunks) {
        const id = createId();
        await tx.$executeRawUnsafe(
          `
            INSERT INTO "KnowledgeChunk" (
              "id", "workspaceId", "knowledgeBaseId", "documentId", "index",
              "content", "tokenCount", "metadata", "embedding", "embeddingModel", "embeddingProvider"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::vector, $10, $11::"EmbeddingProvider")
          `,
          id,
          document.workspaceId,
          document.knowledgeBaseId,
          document.id,
          chunk.index,
          chunk.content,
          chunk.tokenCount,
          JSON.stringify(chunk.metadata),
          toVectorLiteral(embeddings[chunk.index]),
          KNOWLEDGE_EMBEDDING_MODEL,
          EmbeddingProvider.OPENAI,
        );
      }

      await tx.knowledgeDocument.update({
        where: { id: document.id },
        data: {
          sourceText: parsedDocument.text,
          status: KnowledgeDocumentStatus.READY,
          chunkCount: chunks.length,
          error: null,
          processedAt: new Date(),
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process document';
    await prisma.knowledgeDocument.update({
      where: { id: document.id },
      data: {
        status: KnowledgeDocumentStatus.FAILED,
        error: message,
        processedAt: new Date(),
      },
    });
    throw error;
  }
};
