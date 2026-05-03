import { NonRetriableError } from 'inngest';
import { inngest } from './client';
import prisma from '@/lib/db';
import { topologicalSort, sendWorkflowExecution, calculateNextRun } from './utils';
import { getExecutor } from '@/features/executions/lib/executor-registry';
import {
  ExecutionNodeStatus,
  ExecutionStatus,
  NodeType,
  WorkflowVersionStatus,
} from '@prisma/client';
import type { Node, Connection } from '@prisma/client';
import {
  getAiLogFields,
  getDurationMs,
  getErrorMessage,
  getErrorStack,
  skippedNodeData,
  toJson,
} from '@/features/executions/lib/logging';
import {
  getIdempotencyKey,
  getRetryConfig,
  getRetryDelayMs,
  isRetryableError,
  wait,
} from '@/features/executions/lib/retry';
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

type VersionNode = Node & {
  data: Record<string, unknown>;
};

const toExecutionNodes = (nodes: unknown): VersionNode[] => {
  return (nodes as Array<Record<string, unknown>>).map(node => ({
    id: String(node.id),
    workflowId: '',
    name: String(node.type ?? node.name ?? 'unknown'),
    type: node.type as NodeType,
    position: node.position ?? { x: 0, y: 0 },
    data: (node.data as Record<string, unknown>) ?? {},
    retryEnabled: Boolean((node.data as Record<string, unknown>)?.retryEnabled ?? false),
    retryMaxAttempts: Number((node.data as Record<string, unknown>)?.retryMaxAttempts ?? 1),
    retryStrategy: ((node.data as Record<string, unknown>)?.retryStrategy ?? 'fixed') as never,
    retryBaseDelayMs: Number((node.data as Record<string, unknown>)?.retryBaseDelayMs ?? 1000),
    retryMaxDelayMs: Number((node.data as Record<string, unknown>)?.retryMaxDelayMs ?? 30000),
    credentialId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })) as VersionNode[];
};

const toExecutionConnections = (connections: unknown): Connection[] => {
  return (connections as Array<Record<string, unknown>>).map((connection, index) => ({
    id: String(connection.id ?? index),
    workflowId: '',
    fromNodeId: String(connection.fromNodeId ?? connection.source),
    toNodeId: String(connection.toNodeId ?? connection.target),
    fromOutput: String(connection.fromOutput ?? connection.sourceHandle ?? 'main'),
    toInput: String(connection.toInput ?? connection.targetHandle ?? 'main'),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
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
          completedAt: new Date(),
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
    const workspaceId = event.data.workspaceId;
    const workflowVersionId = event.data.workflowVersionId;
    if (!inngestEventId || !workflowId || !workspaceId || !workflowVersionId) {
      throw new NonRetriableError('Event ID, Workflow ID, workspace ID, or version ID is missing');
    }
    const execution = await step.run('create-execution', async () => {
      return prisma.execution.create({
        data: {
          workflowId,
          workspaceId,
          workflowVersionId,
          inngestEventId,
        },
      });
    });

    const workflowData = await step.run('prepare workflow', async () => {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { publishedVersion: true },
      });
      if (!workflow) throw new NonRetriableError(`Workflow ${workflowId} not found`);
      if (workflow.publishedVersionId !== workflowVersionId || !workflow.publishedVersion) {
        throw new NonRetriableError(
          `Workflow ${workflowId} published version changed or is missing`,
        );
      }
      if (workflow.publishedVersion.status !== WorkflowVersionStatus.PUBLISHED) {
        throw new NonRetriableError(`Workflow ${workflowId} version is not published`);
      }
      return workflow;
    });

    const publishedVersion = workflowData.publishedVersion;
    if (!publishedVersion) {
      throw new NonRetriableError(`Workflow ${workflowId} published version is missing`);
    }
    const nodes = toExecutionNodes(publishedVersion.nodes);
    const connections = toExecutionConnections(publishedVersion.connections);
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

    const initialData = (event.data.initialData || {}) as Record<string, unknown>;
    const manualRetry =
      initialData.manualRetry && typeof initialData.manualRetry === 'object'
        ? (initialData.manualRetry as { nodeId?: string; context?: Record<string, unknown> })
        : null;
    let retryStartReached = !manualRetry?.nodeId;

    let context: Record<string, unknown> = {
      ...(manualRetry?.context || initialData),
      workflowId,
      workspaceId,
      workflowVersionId,
      executionId: execution.id,
    };

    for (const node of sortedNodes) {
      if (!retryStartReached) {
        retryStartReached = node.id === manualRetry?.nodeId;
        if (!retryStartReached) {
          continue;
        }
      }

      if (!isNodeActive(node, branchDeps, activeBranches)) {
        await step.run(`log-skipped-${node.id}`, async () => {
          return prisma.executionNode.create({
            data: {
              executionId: execution.id,
              nodeId: node.id,
              nodeType: node.type,
              nodeName: node.name,
              attempt: 0,
              input: toJson(context),
              ...skippedNodeData,
            },
          });
        });
        continue;
      }

      const executor = getExecutor(node.type as NodeType);
      const retryConfig = getRetryConfig(node.type, node.data as Record<string, unknown>);
      let attempt = 1;
      let lastError: unknown;

      while (attempt <= retryConfig.maxAttempts) {
        const attemptStartedAt = new Date();
        const nodeLog = await step.run(`log-start-${node.id}-${attempt}`, async () => {
          return prisma.executionNode.create({
            data: {
              executionId: execution.id,
              nodeId: node.id,
              nodeType: node.type,
              nodeName: node.name,
              attempt,
              retryCount: attempt - 1,
              retryEnabled: retryConfig.enabled,
              maxAttempts: retryConfig.maxAttempts,
              retryStrategy: retryConfig.strategy,
              baseDelayMs: retryConfig.baseDelayMs,
              maxDelayMs: retryConfig.maxDelayMs,
              status: ExecutionNodeStatus.RUNNING,
              input: toJson(context),
              startedAt: attemptStartedAt,
            },
          });
        });

        try {
          const nextContext = await executor({
            data: node.data as Record<string, unknown>,
            nodeId: node.id,
            executionId: execution.id,
            attempt,
            idempotencyKey: getIdempotencyKey({
              executionId: execution.id,
              nodeId: node.id,
              attempt,
            }),
            userId,
            workspaceId,
            context,
            step,
            publish,
          });

          await step.run(`log-success-${node.id}-${attempt}`, async () => {
            return prisma.executionNode.update({
              where: { id: nodeLog.id },
              data: {
                status: ExecutionNodeStatus.SUCCESS,
                output: toJson(nextContext),
                completedAt: new Date(),
                durationMs: getDurationMs(attemptStartedAt),
                ...getAiLogFields({
                  nodeType: node.type,
                  data: node.data as Record<string, unknown>,
                  context,
                  output: nextContext,
                }),
              },
            });
          });

          context = nextContext;
          lastError = undefined;
          break;
        } catch (error) {
          lastError = error;
          const canRetry =
            retryConfig.enabled && attempt < retryConfig.maxAttempts && isRetryableError(error);
          const delayMs = canRetry ? getRetryDelayMs(attempt, retryConfig) : null;
          const nextRetryAt = delayMs === null ? null : new Date(Date.now() + delayMs);

          await step.run(`log-failed-${node.id}-${attempt}`, async () => {
            return prisma.executionNode.update({
              where: { id: nodeLog.id },
              data: {
                status: ExecutionNodeStatus.FAILED,
                error: getErrorMessage(error),
                errorStack: getErrorStack(error),
                lastError: getErrorMessage(error),
                nextRetryAt,
                completedAt: new Date(),
                durationMs: getDurationMs(attemptStartedAt),
              },
            });
          });

          if (!canRetry || delayMs === null) {
            break;
          }

          await wait(delayMs);
          attempt += 1;
        }
      }

      if (lastError) {
        throw lastError;
      }

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
          output: toJson(context),
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
