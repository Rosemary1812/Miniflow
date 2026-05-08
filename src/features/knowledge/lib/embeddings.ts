import { createOpenAI } from '@ai-sdk/openai';
import { CredentialType } from '@prisma/client';
import { embed, embedMany } from 'ai';
import { NonRetriableError } from 'inngest';
import prisma from '@/lib/db';
import { decrypt } from '@/lib/crypto';

export const KNOWLEDGE_EMBEDDING_MODEL = 'text-embedding-3-small';
export const KNOWLEDGE_EMBEDDING_DIMENSIONS = 1536;

export const getOpenAIEmbeddingModel = async (workspaceId: string) => {
  const credential = await prisma.credential.findFirst({
    where: {
      workspaceId,
      type: CredentialType.OPENAI,
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!credential) {
    throw new NonRetriableError('OpenAI credential is required to embed knowledge documents');
  }

  const apiKey = decrypt(credential.encryptedValue, credential.iv);
  const openai = createOpenAI({ apiKey });
  return openai.embedding(KNOWLEDGE_EMBEDDING_MODEL);
};

export const embedKnowledgeQuery = async ({
  workspaceId,
  query,
}: {
  workspaceId: string;
  query: string;
}): Promise<number[]> => {
  const model = await getOpenAIEmbeddingModel(workspaceId);
  const result = await embed({ model, value: query });
  return result.embedding;
};

export const embedKnowledgeTexts = async ({
  workspaceId,
  texts,
}: {
  workspaceId: string;
  texts: string[];
}): Promise<number[][]> => {
  const model = await getOpenAIEmbeddingModel(workspaceId);
  const result = await embedMany({ model, values: texts });
  return result.embeddings;
};
