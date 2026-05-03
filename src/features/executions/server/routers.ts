import { createTRPCRouter, protectedProcedure } from '@/app/trpc/init';
import { PAGINATION } from '@/config/constants';
import prisma from '@/lib/db';
import { requireWorkspaceRole } from '@/lib/workspace';
import { sendWorkflowExecution } from '@/inngest/utils';
import z from 'zod';
import { subDays, startOfDay, format } from 'date-fns';
import { ExecutionNodeStatus, WorkspaceRole } from '@prisma/client';
import { TRPCError } from '@trpc/server';

export const executionsRouter = createTRPCRouter({
  getOne: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const execution = await prisma.execution.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
        workflowVersion: {
          select: {
            id: true,
            version: true,
            status: true,
            name: true,
          },
        },
        nodes: {
          orderBy: [{ createdAt: 'asc' }, { attempt: 'asc' }],
        },
      },
    });

    await requireWorkspaceRole({
      userId: ctx.auth.user.id,
      workspaceId: execution.workspaceId,
      minRole: WorkspaceRole.VIEWER,
    });

    return execution;
  }),

  getMany: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().optional(),
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;
      const workspaceId = input.workspaceId ?? ctx.workspaceId;
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });

      const [items, totalCount] = await Promise.all([
        prisma.execution.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: { workspaceId },
          orderBy: {
            startedAt: 'desc',
          },
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
              },
            },
            workflowVersion: {
              select: { id: true, version: true, status: true },
            },
            nodes: {
              select: {
                id: true,
                status: true,
                error: true,
              },
            },
          },
        }),
        prisma.execution.count({ where: { workspaceId } }),
      ]);
      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNestPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNestPage,
        hasPreviousPage,
      };
    }),

  getNodeLogs: protectedProcedure
    .input(z.object({ executionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const execution = await prisma.execution.findUniqueOrThrow({
        where: { id: input.executionId },
        select: { workspaceId: true },
      });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: execution.workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });

      return prisma.executionNode.findMany({
        where: { executionId: input.executionId },
        orderBy: [{ createdAt: 'asc' }, { attempt: 'asc' }],
      });
    }),

  getNodeLog: protectedProcedure
    .input(z.object({ executionNodeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const node = await prisma.executionNode.findUniqueOrThrow({
        where: { id: input.executionNodeId },
        include: { execution: { select: { workspaceId: true } } },
      });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: node.execution.workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });

      return node;
    }),

  getNodeRetryState: protectedProcedure
    .input(z.object({ executionNodeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const node = await prisma.executionNode.findUniqueOrThrow({
        where: { id: input.executionNodeId },
        include: { execution: { select: { workspaceId: true } } },
      });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: node.execution.workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });

      return {
        attempt: node.attempt,
        retryCount: node.retryCount,
        nextRetryAt: node.nextRetryAt,
        lastError: node.lastError,
        retryEnabled: node.retryEnabled,
        maxAttempts: node.maxAttempts,
      };
    }),

  retryNode: protectedProcedure
    .input(z.object({ executionNodeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const node = await prisma.executionNode.findUniqueOrThrow({
        where: { id: input.executionNodeId },
        include: {
          execution: {
            include: {
              workflow: { select: { id: true, publishedVersionId: true } },
            },
          },
        },
      });

      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: node.execution.workspaceId,
        minRole: WorkspaceRole.EDITOR,
      });

      if (node.status !== ExecutionNodeStatus.FAILED) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only failed nodes can be retried' });
      }

      return sendWorkflowExecution({
        workflowId: node.execution.workflowId,
        workspaceId: node.execution.workspaceId,
        workflowVersionId: node.execution.workflowVersionId,
        initialData: {
          manualRetry: {
            executionNodeId: node.id,
            nodeId: node.nodeId,
            context: node.input,
          },
        },
      });
    }),

  retryFromNode: protectedProcedure
    .input(z.object({ executionId: z.string(), nodeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const execution = await prisma.execution.findUniqueOrThrow({
        where: { id: input.executionId },
      });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: execution.workspaceId,
        minRole: WorkspaceRole.EDITOR,
      });

      return sendWorkflowExecution({
        workflowId: execution.workflowId,
        workspaceId: execution.workspaceId,
        workflowVersionId: execution.workflowVersionId,
        initialData: {
          manualRetry: {
            executionId: execution.id,
            nodeId: input.nodeId,
          },
        },
      });
    }),

  getAnalytics: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().optional(),
        days: z.number().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const workspaceId = input.workspaceId ?? ctx.workspaceId;
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });
      const since = subDays(new Date(), input.days);

      const [total, success, failed] = await Promise.all([
        prisma.execution.count({
          where: {
            workspaceId,
            startedAt: { gte: since },
          },
        }),
        prisma.execution.count({
          where: {
            workspaceId,
            status: 'SUCCESS',
            startedAt: { gte: since },
          },
        }),
        prisma.execution.count({
          where: {
            workspaceId,
            status: 'FAILED',
            startedAt: { gte: since },
          },
        }),
      ]);

      const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

      const executions = await prisma.execution.findMany({
        where: {
          workspaceId,
          startedAt: { gte: since },
        },
        select: { status: true, startedAt: true },
      });

      const days = input.days;
      const dayLabels: string[] = [];
      const successByDay: number[] = [];
      const failedByDay: number[] = [];
      const totalByDay: number[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const day = subDays(startOfDay(new Date()), i);
        const label = format(day, 'MM/dd');
        dayLabels.push(label);

        const s = executions.filter(
          e => startOfDay(e.startedAt).getTime() === day.getTime() && e.status === 'SUCCESS',
        ).length;
        const f = executions.filter(
          e => startOfDay(e.startedAt).getTime() === day.getTime() && e.status === 'FAILED',
        ).length;

        successByDay.push(s);
        failedByDay.push(f);
        totalByDay.push(s + f);
      }

      const workflowStats = await prisma.execution.groupBy({
        by: ['workflowId'],
        where: {
          workspaceId,
          startedAt: { gte: since },
        },
        _count: true,
      });

      const workflowIds = workflowStats.map(w => w.workflowId);
      const workflowNames = await prisma.workflow.findMany({
        where: { id: { in: workflowIds } },
        select: { id: true, name: true },
      });
      const nameMap = new Map(workflowNames.map(w => [w.id, w.name]));

      const [successByWorkflow, failedByWorkflow] = await Promise.all([
        prisma.execution.groupBy({
          by: ['workflowId'],
          where: {
            workspaceId,
            status: 'SUCCESS',
            startedAt: { gte: since },
          },
          _count: true,
        }),
        prisma.execution.groupBy({
          by: ['workflowId'],
          where: {
            workspaceId,
            status: 'FAILED',
            startedAt: { gte: since },
          },
          _count: true,
        }),
      ]);

      const successMap = new Map(successByWorkflow.map(w => [w.workflowId, w._count]));
      const failedMap = new Map(failedByWorkflow.map(w => [w.workflowId, w._count]));

      const workflowSummary = workflowStats.map(w => {
        const s = successMap.get(w.workflowId) || 0;
        const f = failedMap.get(w.workflowId) || 0;
        const t = s + f;
        return {
          workflowId: w.workflowId,
          name: nameMap.get(w.workflowId) || 'Unknown',
          total: t,
          success: s,
          failed: f,
          successRate: t > 0 ? Math.round((s / t) * 100) : 0,
        };
      });

      return {
        summary: { total, success, failed, successRate },
        trend: {
          labels: dayLabels,
          success: successByDay,
          failed: failedByDay,
          total: totalByDay,
        },
        byWorkflow: workflowSummary,
      };
    }),
});
