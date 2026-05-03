'use client';

import { useState, useCallback } from 'react';
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  type Connection,
  Background,
  Controls,
  MiniMap,
  Panel,
} from '@xyflow/react';
import { LoadingView, ErrorView } from '@/components/entity-components';
import { useSuspenseWorkflow } from '@/features/workflows/hooks/use-workflows';

import '@xyflow/react/dist/style.css';
import { nodeComponents } from '@/config/node-components';

import { AddNodeButton } from './add-node-button';
import { editorAtom } from '../editor/store/atoms';
import { useSetAtom } from 'jotai';
import { ExecuteWorkflowButton } from './execute-workflow-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircleIcon } from 'lucide-react';
import { WorkspaceRole } from '@prisma/client';
import { NodeConfigDialog } from '@/features/workflow-nodes/components/node-config-dialog';

export const EditorLoading = () => {
  return <LoadingView message="Loading editor..." />;
};

export const EditorError = () => {
  return <ErrorView message="Error loading editor" />;
};

export const Editor = ({ workflowId }: { workflowId: string }) => {
  const { data: workflow } = useSuspenseWorkflow(workflowId);

  const setEditor = useSetAtom(editorAtom);

  const [nodes, setNodes] = useState<Node[]>(workflow.nodes);
  const [edges, setEdges] = useState<Edge[]>(workflow.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(nodesSnapshot => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(edgesSnapshot => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params: Connection) => setEdges(edgesSnapshot => addEdge(params, edgesSnapshot)),
    [],
  );

  const isReadonly = workflow.currentUserRole === WorkspaceRole.VIEWER;
  const executeDisabledReason = isReadonly
    ? 'Viewers cannot execute workflows.'
    : workflow.publishedVersion
      ? undefined
      : 'Submit the draft for review and publish it before execution.';
  const selectedNode = nodes.find(node => node.id === selectedNodeId) ?? null;

  const handleNodeConfigSubmit = (nodeId: string, data: Record<string, unknown>) => {
    setNodes(nodesSnapshot =>
      nodesSnapshot.map(node =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            }
          : node,
      ),
    );
  };

  return (
    <div className="size-full">
      <NodeConfigDialog
        node={selectedNode}
        open={isConfigOpen}
        onOpenChange={setIsConfigOpen}
        onSubmit={handleNodeConfigSubmit}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        nodesDraggable={!isReadonly}
        nodesConnectable={!isReadonly}
        elementsSelectable={!isReadonly}
        fitView
        nodeTypes={nodeComponents}
        onInit={setEditor}
        // proOptions={{
        //   hideAttribution: true,
        // }}
        snapGrid={[10, 10]}
        snapToGrid
        panOnScroll
        panOnDrag={false}
        selectionOnDrag
      >
        <Background />
        <Controls />
        <MiniMap />
        <Panel position="top-right">
          <div className="flex items-center gap-2">
            <AddNodeButton disabled={isReadonly} />
            <Button
              size="sm"
              variant="secondary"
              disabled={isReadonly || !selectedNode}
              onClick={() => setIsConfigOpen(true)}
            >
              Configure
            </Button>
          </div>
        </Panel>
        {isReadonly && (
          <Panel position="top-left">
            <Alert className="w-[280px] bg-background/95 shadow-sm">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Read only</AlertTitle>
              <AlertDescription>Your workspace role is VIEWER.</AlertDescription>
            </Alert>
          </Panel>
        )}
        {executeDisabledReason && (
          <Panel position="top-center">
            <Alert className="w-[360px] bg-background/95 shadow-sm">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Workflow is not published</AlertTitle>
              <AlertDescription>
                Submit the draft for review and publish it before execution.
              </AlertDescription>
            </Alert>
          </Panel>
        )}
        <Panel position="bottom-center">
          <ExecuteWorkflowButton workflowId={workflowId} disabledReason={executeDisabledReason} />
        </Panel>
      </ReactFlow>
    </div>
  );
};
