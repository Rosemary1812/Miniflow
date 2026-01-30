import { NonRetriableError } from 'inngest';
import { inngest } from './client';
import prisma from '@/lib/db';
import { topologicalSort } from './utils';
import { getExecutor } from '@/features/exexutions/lib/executor-registry';
import { NodeType } from '@prisma/client';
export const executeWorkflow = inngest.createFunction(
  { id: 'execute-workflow' },
  { event: 'workflows/execute.workflow' },
  async ({ event, step }) => {
    const workflowId = event.data.workflowId;
    if (!workflowId) {
      throw new NonRetriableError('Workflow ID is missing');
    }
    const sortedNodes = await step.run('prepare workflow', async () => {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { nodes: true, connections: true },
      });
      return topologicalSort(workflow.nodes, workflow.connections);
    });

    // Initialize the context with any initial data from triggers

    let context = event.data.initialData || {};

    for (const node of sortedNodes) {
      const executor = getExecutor(node.type as NodeType);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        context,
        step,
      });
    }
    return {
      workflowId,
      result: context,
    };
  },
);
