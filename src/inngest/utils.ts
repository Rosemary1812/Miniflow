import toposort from 'toposort';
import { Connection, Node } from '@prisma/client';
import { inngest } from './client';
import { createId } from '@paralleldrive/cuid2';
import prisma from '@/lib/db';
export const topologicalSort = (nodes: Node[], connections: Connection[]): Node[] => {
  if (connections.length === 0) {
    return nodes;
  }

  const edges: [string, string][] = connections.map(conn => [conn.fromNodeId, conn.toNodeId]);

  const connectedNodeIds = new Set<string>();
  for (const conn of connections) {
    connectedNodeIds.add(conn.fromNodeId);
    connectedNodeIds.add(conn.toNodeId);
  }
  for (const node of nodes) {
    if (!connectedNodeIds.has(node.id)) {
      edges.push([node.id, node.id]);
    }
  }

  let sortedNodeIds: string[];
  try {
    sortedNodeIds = toposort(edges);
    sortedNodeIds = [...new Set(sortedNodeIds)];
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cyclic')) {
      throw new Error('Workflow contains a cycle');
    }
    throw error;
  }
  // Map sorted Ids backs To Nodes
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  return sortedNodeIds.map(id => nodeMap.get(id)!).filter(Boolean);
};

export const sendWorkflowExecution = async (data: { workflowId: string; [key: string]: any }) => {
  return inngest.send({
    name: 'workflows/execute.workflow',
    data,
    id: createId(),
  });
};

export const upsertScheduledWorkflow = async ({
  workflowId,
  cron,
  timezone,
}: {
  workflowId: string;
  cron: string;
  timezone: string;
}) => {
  const nextRunAt = calculateNextRun(cron, timezone);
  return prisma.scheduledWorkflow.upsert({
    where: { workflowId },
    update: { cron, timezone, nextRunAt, active: true },
    create: { workflowId, cron, timezone, nextRunAt, active: true },
  });
};

/**
 * Calculate the next run time for a cron expression in a given timezone.
 * This is a simplified parser for standard 5-field cron expressions.
 */
export const calculateNextRun = (cron: string, timezone: string): Date => {
  const now = new Date();
  // For now, return a simple heuristic: parse minute field
  // In production, use a proper cron library like cron-parser
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return new Date(now.getTime() + 5 * 60 * 1000); // default 5 min

  const [minuteStr, hourStr, dayStr, monthStr, weekdayStr] = parts;

  let minute = 0, hour = 0;

  if (minuteStr.startsWith('*/')) {
    const interval = parseInt(minuteStr.slice(2));
    minute = Math.ceil(now.getMinutes() / interval) * interval;
    if (minute >= 60) {
      minute = minute % 60;
      hour = now.getHours() + 1;
    }
  } else {
    minute = parseInt(minuteStr) || 0;
  }

  if (hourStr.startsWith('*/')) {
    const interval = parseInt(hourStr.slice(2));
    hour = Math.ceil((now.getHours() + (minute <= now.getMinutes() ? 1 : 0)) / interval) * interval;
    if (hour >= 24) hour = hour % 24;
  } else {
    hour = parseInt(hourStr) || 0;
  }

  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setMinutes(minute);
  next.setHours(hour);

  // If the calculated time is in the past, add the smallest interval (5 min)
  if (next <= now) {
    next.setTime(next.getTime() + 5 * 60 * 1000);
  }

  return next;
};
