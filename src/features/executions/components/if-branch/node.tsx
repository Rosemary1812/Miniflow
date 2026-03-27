'use client';

import { Node, NodeProps, Position, useReactFlow } from '@xyflow/react';
import { GitBranchIcon } from 'lucide-react';
import { memo, useState } from 'react';
import { BaseHandle } from '@/components/react-flow/base-handle';
import { IfBranchFormValues, IfBranchDialog } from './dialog';
import { useNodeStatus } from '@/features/executions/hooks/use-node-status';
import { IF_BRANCH_CHANNEL_NAME } from '@/inngest/channels/if-branch';
import { fetchIfBranchRealtimeToken } from './actions';

type IfBranchNodeData = {
  variable?: string;
  operator?: string;
  value?: string;
};

type IfBranchNodeType = Node<IfBranchNodeData>;

export const IfBranchNode = memo((props: NodeProps<IfBranchNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IF_BRANCH_CHANNEL_NAME,
    topic: 'status',
    refreshToken: fetchIfBranchRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: IfBranchFormValues) => {
    setNodes(nodes =>
      nodes.map(node => {
        if (node.id === props.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...values,
            },
          };
        }
        return node;
      }),
    );
  };

  const nodeData = props.data as IfBranchNodeData;
  const description = nodeData?.variable
    ? `${nodeData.variable} ${nodeData.operator || 'equals'} ${
        nodeData.value !== undefined ? nodeData.value : '...'
      }`
    : 'Not configured';

  return (
    <>
      <IfBranchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData as Partial<IfBranchFormValues>}
      />
      <div
        className="group relative cursor-pointer"
        onDoubleClick={handleOpenSettings}
        onClick={handleOpenSettings}
      >
        {/* Target handle (input) */}
        <BaseHandle id="target-main" type="target" position={Position.Left} className="!top-1/2" />

        {/* Node content */}
        <div className="flex min-w-[180px] items-center gap-2 rounded-md border border-border bg-background px-3 py-2 shadow-sm">
          <GitBranchIcon className="size-4 text-muted-foreground shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              If / Branch
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[160px]">
              {description}
            </span>
          </div>
        </div>

        {/* Status indicator */}
        {nodeStatus !== 'initial' && (
          <div className="absolute -top-1 -right-1">
            <div
              className={`size-2 rounded-full ${
                nodeStatus === 'success'
                  ? 'bg-green-500'
                  : nodeStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
              }`}
            />
          </div>
        )}

        {/* True output handle (top-right) */}
        <div className="absolute right-0 top-0 translate-x-full -translate-y-1/2 px-1">
          <div className="flex flex-col items-center gap-0.5">
            <BaseHandle
              id="source-true"
              type="source"
              position={Position.Right}
              className="!bg-green-500 !border-green-500"
            />
            <span className="text-[10px] text-green-600 font-medium leading-none">True</span>
          </div>
        </div>

        {/* False output handle (bottom-right) */}
        <div className="absolute right-0 bottom-0 translate-x-full translate-y-1/2 px-1">
          <div className="flex flex-col items-center gap-0.5">
            <BaseHandle
              id="source-false"
              type="source"
              position={Position.Right}
              className="!bg-red-500 !border-red-500"
            />
            <span className="text-[10px] text-red-600 font-medium leading-none">False</span>
          </div>
        </div>
      </div>
    </>
  );
});

IfBranchNode.displayName = 'IfBranchNode';
