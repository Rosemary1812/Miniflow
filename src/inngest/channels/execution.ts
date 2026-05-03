import { channel } from '@inngest/realtime';

export const executionChannel = () => {
  return channel('workflows/execute.execution');
};
