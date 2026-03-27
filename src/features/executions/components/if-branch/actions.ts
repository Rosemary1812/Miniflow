'use server';

import { getSubscriptionToken, type Realtime } from '@inngest/realtime';
import { ifBranchChannel } from '@/inngest/channels/if-branch';
import { inngest } from '@/inngest/client';

export type IfBranchToken = Realtime.Token<typeof ifBranchChannel, ['status']>;

export async function fetchIfBranchRealtimeToken(): Promise<IfBranchToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: ifBranchChannel(),
    topics: ['status'],
  });
  return token;
}
