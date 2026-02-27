import { channel } from '@inngest/realtime';

export const executionChannel = () => {
  return channel({
    name: 'workflows/execute.execution',
  });
};
