'use client';

import { Node, NodeProps, useReactFlow } from '@xyflow/react';
import { SearchIcon } from 'lucide-react';
import { memo, useState } from 'react';
import { BaseExecutionNode } from '../base-execution-node';
import { KNOWLEDGE_RETRIEVAL_CHANNEL_NAME } from '@/inngest/channels/knowledge-retrieval';
import { useNodeStatus } from '@/features/executions/hooks/use-node-status';
import { fetchKnowledgeRetrievalRealtimeToken } from './actions';
import {
  KnowledgeRetrievalDialog,
  type KnowledgeRetrievalFormValues,
} from './dialog';

type KnowledgeRetrievalNodeType = Node<KnowledgeRetrievalFormValues>;

export const KnowledgeRetrievalNode = memo((props: NodeProps<KnowledgeRetrievalNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: KNOWLEDGE_RETRIEVAL_CHANNEL_NAME,
    topic: 'status',
    refreshToken: fetchKnowledgeRetrievalRealtimeToken,
  });

  const handleSubmit = (values: KnowledgeRetrievalFormValues) => {
    setNodes(nodes =>
      nodes.map(node =>
        node.id === props.id
          ? {
              ...node,
              data: {
                ...node.data,
                ...values,
              },
            }
          : node,
      ),
    );
  };

  const description = props.data?.knowledgeBaseIds?.length
    ? `${props.data.knowledgeBaseIds.length} knowledge base(s)`
    : 'Not configured';

  return (
    <>
      <KnowledgeRetrievalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={SearchIcon}
        name="Knowledge Retrieval"
        status={nodeStatus}
        description={description}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

KnowledgeRetrievalNode.displayName = 'KnowledgeRetrievalNode';
