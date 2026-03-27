import { createTRPCRouter, protectedProcedure } from '@/app/trpc/init';
import { PAGINATION } from '@/config/constants';
import prisma from '@/lib/db';
import z from 'zod';
import { subDays, startOfDay, format } from 'date-fns';

export const executionsRouter = createTRPCRouter({
  getOne: protectedProcedure.input(z.object({ id: z.string() })).query(({ ctx, input }) => {
    return prisma.execution.findUniqueOrThrow({
      where: {
        id: input.id,
        workflow: { userId: ctx.auth.user.id },
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }),
  getMany: protectedProcedure
    .input(
      z.object({
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
      const [items, totalCount] = await Promise.all([
        prisma.execution.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            workflow: { userId: ctx.auth.user.id },
          },
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
          },
        }),
        prisma.execution.count({
          where: {
            workflow: { userId: ctx.auth.user.id },
          },
        }),
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

  getAnalytics: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const since = subDays(new Date(), input.days);

      // 1. Summary counts
      const [total, success, failed] = await Promise.all([
        prisma.execution.count({
          where: {
            workflow: { userId },
            startedAt: { gte: since },
          },
        }),
        prisma.execution.count({
          where: {
            workflow: { userId },
            status: 'SUCCESS',
            startedAt: { gte: since },
          },
        }),
        prisma.execution.count({
          where: {
            workflow: { userId },
            status: 'FAILED',
            startedAt: { gte: since },
          },
        }),
      ]);

      const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

      // 2. Daily trend — use findMany + JS aggregation instead of groupBy on DateTime
      const executions = await prisma.execution.findMany({
        where: {
          workflow: { userId },
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

        const s = executions.filter(e => startOfDay(e.startedAt).getTime() === day.getTime() && e.status === 'SUCCESS').length;
        const f = executions.filter(e => startOfDay(e.startedAt).getTime() === day.getTime() && e.status === 'FAILED').length;

        successByDay.push(s);
        failedByDay.push(f);
        totalByDay.push(s + f);
      }

      // 3. Per-workflow stats — use groupBy by workflowId only (safe scalar)
      const workflowStats = await prisma.execution.groupBy({
        by: ['workflowId'],
        where: {
          workflow: { userId },
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
            workflow: { userId },
            status: 'SUCCESS',
            startedAt: { gte: since },
          },
          _count: true,
        }),
        prisma.execution.groupBy({
          by: ['workflowId'],
          where: {
            workflow: { userId },
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
