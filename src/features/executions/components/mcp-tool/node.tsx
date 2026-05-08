'use client';

import { Node, NodeProps, useReactFlow } from '@xyflow/react';
import { PlugIcon } from 'lucide-react';
import { memo, useState } from 'react';
import { BaseExecutionNode } from '../base-execution-node';
import { fetchMcpToolRealtimeToken } from './actions';
import { McpToolDialog, McpToolFormValues } from './dialog';
import { MCP_TOOL_CHANNEL_NAME } from '@/inngest/channels/mcp-tool';
import { useNodeStatus } from '@/features/executions/hooks/use-node-status';

type McpToolNodeData = {
  variableName?: string;
  mcpServerId?: string;
  toolName?: string;
  argumentsTemplate?: string;
  timeoutMs?: number;
};

type McpToolNodeType = Node<McpToolNodeData>;

export const McpToolNode = memo((props: NodeProps<McpToolNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: MCP_TOOL_CHANNEL_NAME,
    topic: 'status',
    refreshToken: fetchMcpToolRealtimeToken,
  });
  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: McpToolFormValues) => {
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

  const nodeData = props.data;
  const description = nodeData?.toolName ? `Tool: ${nodeData.toolName}` : 'Not configured';

  return (
    <>
      <McpToolDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={PlugIcon}
        name="MCP Tool"
        status={nodeStatus}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

McpToolNode.displayName = 'McpToolNode';
