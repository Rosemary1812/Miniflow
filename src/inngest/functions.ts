import { NonRetriableError } from 'inngest';
import { inngest } from './client';
import prisma from '@/lib/db';
import { topologicalSort, sendWorkflowExecution, calculateNextRun } from './utils';
import { getExecutor } from '@/features/executions/lib/executor-registry';
import { ExecutionStatus, NodeType } from '@prisma/client';
import type { Node, Connection } from '@prisma/client';
import { httpRequestChannel } from './channels/http-request';
import { manualTriggerChannel } from './channels/manual-trigger';
import { googleFormTriggerChannel } from './channels/google-form-trigger';
import { stripeTriggerChannel } from './channels/stripe-trigger';
import { geminiChannel } from './channels/gemini';
import { openAiChannel } from './channels/openai';
import { anthropicChannel } from './channels/anthropic';
import { discordChannel } from './channels/discord';
import { slackChannel } from './channels/slack';
import { ifBranchChannel } from './channels/if-branch';
import { scheduleTriggerChannel } from './channels/schedule-trigger';

/**
 * Build a map: nodeId -> list of controlling IF_BRANCH paths.
 * Each entry tracks which IF_BRANCH outputs each node depends on.
 * This is used at runtime to determine whether to skip inactive branches.
 */
const buildBranchDependencies = (
  nodes: Node[],
  connections: Connection[],
): Map<string, Array<{ ifBranchNodeId: string; output: string }>> => {
  const deps = new Map<string, Array<{ ifBranchNodeId: string; output: string }>>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const processNode = (nodeId: string, visited: Set<string> = new Set()): void => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    if (!deps.has(nodeId)) {
      deps.set(nodeId, []);
    }

    const incoming = connections.filter(c => c.toNodeId === nodeId);
    for (const conn of incoming) {
      const sourceNode = nodeMap.get(conn.fromNodeId);
      if (!sourceNode) continue;

      if (sourceNode.type === NodeType.IF_BRANCH) {
        deps.get(nodeId)!.push({
          ifBranchNodeId: sourceNode.id,
          output: conn.fromOutput,
        });
      } else {
        processNode(sourceNode.id, visited);
        const parentDeps = deps.get(sourceNode.id);
        if (parentDeps) {
          for (const pd of parentDeps) {
            if (!deps.get(nodeId)!.some(d => d.ifBranchNodeId === pd.ifBranchNodeId)) {
              deps.get(nodeId)!.push(pd);
            }
          }
        }
      }
    }
  };

  for (const node of nodes) {
    processNode(node.id, new Set());
  }

  return deps;
};

/**
 * Check if a node should be executed based on active branch results.
 */
const isNodeActive = (
  node: Node,
  branchDeps: Map<string, Array<{ ifBranchNodeId: string; output: string }>>,
  activeBranches: Map<string, boolean>,
): boolean => {
  const nodeDeps = branchDeps.get(node.id);
  if (!nodeDeps || nodeDeps.length === 0) return true;

  for (const dep of nodeDeps) {
    const active = activeBranches.get(dep.ifBranchNodeId);
    if (active === undefined) continue;
    const expected = dep.output === 'true';
    if (active !== expected) return false;
  }
  return true;
};

export const executeWorkflow = inngest.createFunction(
  {
    id: 'execute-workflow',
    retries: 0,
    onFailure: async ({ event, step }) => {
      return prisma.execution.update({
        where: {
          inngestEventId: event.data.event.id,
        },
        data: {
          status: ExecutionStatus.FAILED,
          error: event.data.error.message,
          errorStack: event.data.error.stack,
        },
      });
    },
  },
  {
    event: 'workflows/execute.workflow',
    channels: [
      httpRequestChannel(),
      manualTriggerChannel(),
      googleFormTriggerChannel(),
      stripeTriggerChannel(),
      geminiChannel(),
      openAiChannel(),
      anthropicChannel(),
      discordChannel(),
      slackChannel(),
      ifBranchChannel(),
      scheduleTriggerChannel(),
    ],
  },
  async ({ event, step, publish }) => {
    const inngestEventId = event.id;
    const workflowId = event.data.workflowId;
    if (!inngestEventId || !workflowId) {
      throw new NonRetriableError('Event ID or Workflow ID is missing');
    }
    await step.run('create-execution', async () => {
      return prisma.execution.create({
        data: {
          workflowId,
          inngestEventId,
        },
      });
    });

    const workflowData = await step.run('prepare workflow', async () => {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { nodes: true, connections: true },
      });
      if (!workflow) throw new NonRetriableError(`Workflow ${workflowId} not found`);
      return workflow;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodes = workflowData.nodes as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connections = workflowData.connections as any;
    const sortedNodes = topologicalSort(nodes, connections);
    const branchDeps = buildBranchDependencies(nodes, connections);

    const userId = await step.run('find-user-id', async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        select: { userId: true },
      });
      return workflow.userId;
    });

    // Track active branch results: ifBranchNodeId -> true/false
    const activeBranches = new Map<string, boolean>();

    let context = event.data.initialData || {};

    for (const node of sortedNodes) {
      if (!isNodeActive(node, branchDeps, activeBranches)) {
        continue;
      }

      const executor = getExecutor(node.type as NodeType);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        userId,
        context,
        step,
        publish,
      });

      // Record IF_BRANCH result for downstream branch decisions
      if (node.type === NodeType.IF_BRANCH) {
        const result = context[`${node.id}_condition`] as boolean;
        activeBranches.set(node.id, result);
      }
    }

    await step.run('update-execution', async () => {
      return prisma.execution.update({
        where: {
          inngestEventId,
          workflowId,
        },
        data: {
          status: ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          output: context,
        },
      });
    });
    return {
      workflowId,
      result: context,
    };
  },
);

/**
 * Polls the ScheduledWorkflow table every minute and triggers
 * any workflows whose nextRunAt has passed.
 * Runs via Inngest's built-in cron trigger (every minute).
 */
export const scheduleRunner = inngest.createFunction(
  {
    id: 'schedule-runner',
    retries: 0,
  },
  { cron: '*/1 * * * *' },
  async ({ step }) => {
    const now = new Date();

    // Find all scheduled workflows that are due
    const dueWorkflows = await step.run('find-due-workflows', async () => {
      return prisma.scheduledWorkflow.findMany({
        where: {
          active: true,
          nextRunAt: { lte: now },
        },
        select: { workflowId: true, cron: true, timezone: true },
      });
    });

    // Trigger each due workflow and update nextRunAt
    for (const scheduled of dueWorkflows) {
      await step.run(`trigger-${scheduled.workflowId}`, async () => {
        await sendWorkflowExecution({ workflowId: scheduled.workflowId });

        // Calculate next run
        const nextRunAt = calculateNextRun(scheduled.cron, scheduled.timezone);
        await prisma.scheduledWorkflow.update({
          where: { workflowId: scheduled.workflowId },
          data: { nextRunAt },
        });
      });
    }
  },
);
