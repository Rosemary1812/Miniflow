import { channel, topic } from '@inngest/realtime';

export const IF_BRANCH_CHANNEL_NAME = 'if-branch-execution';

export const ifBranchChannel = channel(IF_BRANCH_CHANNEL_NAME).addTopic(
  topic('status').type<{
    nodeId: string;
    status: 'loading' | 'success' | 'error';
    result?: boolean;
  }>(),
);
