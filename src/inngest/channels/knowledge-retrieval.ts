import { channel, topic } from '@inngest/realtime';

export const KNOWLEDGE_RETRIEVAL_CHANNEL_NAME = 'knowledge-retrieval-execution';

export const knowledgeRetrievalChannel = channel(KNOWLEDGE_RETRIEVAL_CHANNEL_NAME).addTopic(
  topic('status').type<{
    nodeId: string;
    status: 'loading' | 'success' | 'error';
  }>(),
);
