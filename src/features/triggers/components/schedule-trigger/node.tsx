'use client';

import { NodeProps, useReactFlow } from '@xyflow/react';
import { ClockIcon } from 'lucide-react';
import { memo, useState } from 'react';
import { BaseTriggerNode } from '../base-trigger-node';
import { ScheduleTriggerDialog } from './dialog';
import { useNodeStatus } from '@/features/executions/hooks/use-node-status';
import { SCHEDULE_TRIGGER_CHANNEL_NAME } from '@/inngest/channels/schedule-trigger';
import { fetchScheduleTriggerRealtimeToken } from './actions';

type ScheduleTriggerNodeData = {
  cron?: string;
  timezone?: string;
};

export const ScheduleTriggerNode = memo((props: NodeProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: SCHEDULE_TRIGGER_CHANNEL_NAME,
    topic: 'status',
    refreshToken: fetchScheduleTriggerRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: { cron: string; timezone: string }) => {
    setNodes(nodes =>
      nodes.map(node => {
        if (node.id === props.id) {
          return {
            ...node,
            data: {
              ...node.data,
              cron: values.cron,
              timezone: values.timezone,
            },
          };
        }
        return node;
      }),
    );
  };

  const nodeData = props.data as ScheduleTriggerNodeData;
  const description = nodeData?.cron
    ? `Cron: ${nodeData.cron} (${nodeData.timezone || 'UTC'})`
    : 'Not configured';

  return (
    <>
      <ScheduleTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{ cron: nodeData?.cron, timezone: nodeData?.timezone }}
      />
      <BaseTriggerNode
        {...props}
        icon={ClockIcon}
        name="Schedule Trigger"
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
        description={description}
      />
    </>
  );
});

ScheduleTriggerNode.displayName = 'ScheduleTriggerNode';
