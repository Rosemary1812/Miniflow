import Handlebars from 'handlebars';
import { NonRetriableError } from 'inngest';
import type { NodeExecutor } from '@/features/executions/types';
import prisma from '@/lib/db';
import { retrieveKnowledge } from '@/features/knowledge/lib/retrieval';
import { knowledgeRetrievalChannel } from '@/inngest/channels/knowledge-retrieval';

Handlebars.registerHelper('json', context => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

export type KnowledgeRetrievalNodeData = {
  variableName?: string;
  queryTemplate?: string;
  knowledgeBaseIds?: string[];
  topK?: number;
  scoreThreshold?: number;
};

const asPositiveInteger = (value: unknown, fallback: number): number => {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
};

const asNumber = (value: unknown, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

export const knowledgeRetrievalExecutor: NodeExecutor<KnowledgeRetrievalNodeData> = async ({
  data,
  nodeId,
  workspaceId,
  context,
  publish,
}) => {
  await publish(knowledgeRetrievalChannel().status({ nodeId, status: 'loading' }));

  const variableName = data.variableName || 'knowledge';
  const knowledgeBaseIds = Array.isArray(data.knowledgeBaseIds) ? data.knowledgeBaseIds : [];
  const queryTemplate = data.queryTemplate || '';
  const query = Handlebars.compile(queryTemplate)(context).trim();
  const topK = Math.min(asPositiveInteger(data.topK, 5), 20);
  const scoreThreshold = asNumber(data.scoreThreshold, 0.25);

  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(variableName)) {
    await publish(knowledgeRetrievalChannel().status({ nodeId, status: 'error' }));
    throw new NonRetriableError('Knowledge Retrieval variableName is invalid');
  }
  if (!query) {
    await publish(knowledgeRetrievalChannel().status({ nodeId, status: 'error' }));
    throw new NonRetriableError('Knowledge Retrieval query is empty');
  }
  if (knowledgeBaseIds.length === 0) {
    await publish(knowledgeRetrievalChannel().status({ nodeId, status: 'error' }));
    throw new NonRetriableError('Knowledge Retrieval requires at least one knowledge base');
  }

  const availableBases = await prisma.knowledgeBase.findMany({
    where: {
      workspaceId,
      id: { in: knowledgeBaseIds },
    },
    select: { id: true },
  });

  if (availableBases.length !== knowledgeBaseIds.length) {
    await publish(knowledgeRetrievalChannel().status({ nodeId, status: 'error' }));
    throw new NonRetriableError('Knowledge Retrieval contains a knowledge base outside the workspace');
  }

  try {
    const result = await retrieveKnowledge({
      workspaceId,
      knowledgeBaseIds,
      query,
      topK,
      scoreThreshold,
    });

    await publish(knowledgeRetrievalChannel().status({ nodeId, status: 'success' }));
    return {
      ...context,
      [variableName]: {
        query,
        result,
      },
    };
  } catch (error) {
    await publish(knowledgeRetrievalChannel().status({ nodeId, status: 'error' }));
    throw error;
  }
};
