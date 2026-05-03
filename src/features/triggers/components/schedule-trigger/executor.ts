import type { NodeExecutor } from '@/features/executions/types';
import { scheduleTriggerChannel } from '@/inngest/channels/schedule-trigger';
import { upsertScheduledWorkflow } from '@/inngest/utils';

type ScheduleTriggerData = {
  cron?: string;
  timezone?: string;
};

export const scheduleTriggerExecutor: NodeExecutor<ScheduleTriggerData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    scheduleTriggerChannel().status({
      nodeId,
      status: 'loading',
    }),
  );

  const result = await step.run('schedule-trigger', async () => {
    if (!data.cron) {
      return context;
    }

    // Extract workflowId from context or node data
    const workflowId = (context as Record<string, unknown>).workflowId as string;
    const workspaceId = (context as Record<string, unknown>).workspaceId as string;
    if (workflowId && workspaceId) {
      await upsertScheduledWorkflow({
        workflowId,
        workspaceId,
        cron: data.cron,
        timezone: data.timezone || 'UTC',
      });
    }
    return context;
  });

  await publish(
    scheduleTriggerChannel().status({
      nodeId,
      status: 'success',
    }),
  );

  return result;
};
