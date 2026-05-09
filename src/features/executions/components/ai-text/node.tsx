'use client';

import { Node, NodeProps } from '@xyflow/react';
import { BotIcon } from 'lucide-react';
import { memo } from 'react';
import { BaseExecutionNode } from '../base-execution-node';
import { useNodeStatus } from '@/features/executions/hooks/use-node-status';
import { fetchAiTextRealtimeToken } from './actions';
import { AI_TEXT_CHANNEL_NAME } from '@/inngest/channels/ai-text';

type AiTextNodeData = {
  providerProfileId?: string;
  variableName?: string;
  systemPrompt?: string;
  userPrompt?: string;
  model?: string;
};

type AiTextNodeType = Node<AiTextNodeData>;

export const AiTextNode = memo((props: NodeProps<AiTextNodeType>) => {
  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: AI_TEXT_CHANNEL_NAME,
    topic: 'status',
    refreshToken: fetchAiTextRealtimeToken,
  });

  const nodeData = props.data;
  const model = nodeData?.model || 'Provider default';
  const description = nodeData?.userPrompt
    ? `${model}: ${nodeData.userPrompt.slice(0, 50)}...`
    : 'Not configured';

  return (
    <BaseExecutionNode
      {...props}
      id={props.id}
      icon={BotIcon}
      name="AI Text"
      status={nodeStatus}
      description={description}
    />
  );
});

AiTextNode.displayName = 'AiTextNode';
