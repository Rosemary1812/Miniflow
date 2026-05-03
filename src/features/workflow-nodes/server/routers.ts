import { createTRPCRouter, protectedProcedure } from '@/app/trpc/init';
import prisma from '@/lib/db';
import { requireWorkspaceRole } from '@/lib/workspace';
import { Prisma, RetryStrategy, WorkflowVersionStatus, WorkspaceRole } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import z from 'zod';

const inputSchema = z.object({
  workflowId: z.string(),
  nodeId: z.string(),
  retryEnabled: z.boolean(),
  retryMaxAttempts: z.number().int().min(1).max(10),
  retryStrategy: z.enum(RetryStrategy),
  retryBaseDelayMs: z.number().int().min(0),
  retryMaxDelayMs: z.number().int().min(0),
});

export const workflowNodesRouter = createTRPCRouter({
  updateRetryConfig: protectedProcedure.input(inputSchema).mutation(async ({ ctx, input }) => {
    const workflow = await prisma.workflow.findUniqueOrThrow({
      where: { id: input.workflowId },
      include: { draftVersion: true },
    });
    await requireWorkspaceRole({
      userId: ctx.auth.user.id,
      workspaceId: workflow.workspaceId,
      minRole: WorkspaceRole.EDITOR,
    });

    if (!workflow.draftVersion || workflow.draftVersion.status !== WorkflowVersionStatus.DRAFT) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Workflow has no editable draft' });
    }

    const nodes = (workflow.draftVersion.nodes as Array<Record<string, unknown>>).map(node => {
      if (node.id !== input.nodeId) {
        return node;
      }

      return {
        ...node,
        data: {
          ...((node.data as Record<string, unknown>) ?? {}),
          retryEnabled: input.retryEnabled,
          retryMaxAttempts: input.retryMaxAttempts,
          retryStrategy: input.retryStrategy,
          retryBaseDelayMs: input.retryBaseDelayMs,
          retryMaxDelayMs: input.retryMaxDelayMs,
        },
      };
    });

    await prisma.node.updateMany({
      where: { workflowId: input.workflowId, id: input.nodeId },
      data: {
        retryEnabled: input.retryEnabled,
        retryMaxAttempts: input.retryMaxAttempts,
        retryStrategy: input.retryStrategy,
        retryBaseDelayMs: input.retryBaseDelayMs,
        retryMaxDelayMs: input.retryMaxDelayMs,
      },
    });

    return prisma.workflowVersion.update({
      where: { id: workflow.draftVersion.id },
      data: { nodes: JSON.parse(JSON.stringify(nodes)) as Prisma.InputJsonValue },
    });
  }),
});
