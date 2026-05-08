'use server';

import { getSubscriptionToken, type Realtime } from '@inngest/realtime';
import { inngest } from '@/inngest/client';
import { mcpToolChannel } from '@/inngest/channels/mcp-tool';

export type McpToolToken = Realtime.Token<typeof mcpToolChannel, ['status']>;

export async function fetchMcpToolRealtimeToken(): Promise<McpToolToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: mcpToolChannel(),
    topics: ['status'],
  });
  return token;
}
