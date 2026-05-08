'use server';

import { getSubscriptionToken, type Realtime } from '@inngest/realtime';
import { inngest } from '@/inngest/client';
import { knowledgeRetrievalChannel } from '@/inngest/channels/knowledge-retrieval';

export type KnowledgeRetrievalToken = Realtime.Token<typeof knowledgeRetrievalChannel, ['status']>;

export const fetchKnowledgeRetrievalRealtimeToken = async (): Promise<KnowledgeRetrievalToken> => {
  return getSubscriptionToken(inngest, {
    channel: knowledgeRetrievalChannel(),
    topics: ['status'],
  });
};
