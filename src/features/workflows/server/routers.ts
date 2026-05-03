import { createTRPCRouter, protectedProcedure } from '@/app/trpc/init';
import { PAGINATION } from '@/config/constants';
import prisma from '@/lib/db';
import { requireWorkspaceRole } from '@/lib/workspace';
import { generateSlug } from 'random-word-slugs';
import z from 'zod';
import type { Edge, Node } from '@xyflow/react';
import {
  NodeType,
  Prisma,
  RetryStrategy,
  WorkflowVersionStatus,
  WorkspaceRole,
} from '@prisma/client';
import { sendWorkflowExecution } from '@/inngest/utils';
import { TRPCError } from '@trpc/server';

const emptyEdges: Edge[] = [];

const asJson = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
};

const asNumber = (value: unknown, fallback: number) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const asRetryStrategy = (value: unknown) => {
  return value === RetryStrategy.exponential || value === RetryStrategy.fixed ? value : undefined;
};

const initialNode = (): Node => ({
  id: crypto.randomUUID(),
  type: NodeType.INITIAL,
  position: { x: 0, y: 0 },
  data: {},
});

const toEditorNode = (node: {
  id: string;
  type: NodeType | string;
  position: unknown;
  data: unknown;
}): Node => ({
  id: node.id,
  position: node.position as { x: number; y: number },
  data: (node.data as Record<string, unknown>) || {},
  type: node.type,
});

const toEditorEdge = (connection: {
  id?: string;
  fromNodeId?: string;
  toNodeId?: string;
  fromOutput?: string;
  toInput?: string;
  source?: string;
  target?: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}): Edge => ({
  id:
    connection.id ??
    `${connection.source ?? connection.fromNodeId}-${connection.target ?? connection.toNodeId}`,
  source: connection.source ?? connection.fromNodeId ?? '',
  target: connection.target ?? connection.toNodeId ?? '',
  sourceHandle: connection.sourceHandle ?? connection.fromOutput ?? 'main',
  targetHandle: connection.targetHandle ?? connection.toInput ?? 'main',
});

const getDraftVersion = async (workflowId: string) => {
  return prisma.workflowVersion.findFirst({
    where: {
      workflowId,
      status: {
        in: [WorkflowVersionStatus.DRAFT, WorkflowVersionStatus.REJECTED],
      },
    },
    orderBy: { version: 'desc' },
  });
};

const approveWorkflowVersion = async ({
  workflowId,
  userId,
  note,
}: {
  workflowId: string;
  userId: string;
  note?: string;
}) => {
  const workflow = await prisma.workflow.findUniqueOrThrow({
    where: { id: workflowId },
    include: { draftVersion: true },
  });
  await requireWorkspaceRole({
    userId,
    workspaceId: workflow.workspaceId,
    minRole: WorkspaceRole.OWNER,
  });

  if (
    !workflow.draftVersion ||
    workflow.draftVersion.status !== WorkflowVersionStatus.PENDING_REVIEW
  ) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Workflow has no pending review version' });
  }

  return prisma.$transaction(async tx => {
    const nextVersion =
      ((
        await tx.workflowVersion.aggregate({
          where: { workflowId: workflow.id },
          _max: { version: true },
        })
      )._max.version ?? 0) + 1;

    const publishedVersion = await tx.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        version: nextVersion,
        name: workflow.draftVersion!.name,
        nodes: asJson(workflow.draftVersion!.nodes),
        connections: asJson(workflow.draftVersion!.connections),
        status: WorkflowVersionStatus.PUBLISHED,
        createdBy: userId,
      },
    });

    await tx.workflow.update({
      where: { id: workflow.id },
      data: {
        publishedVersionId: publishedVersion.id,
        draftVersionId: null,
      },
    });

    await tx.workflowPublishLog.create({
      data: {
        workflowVersionId: publishedVersion.id,
        publishedBy: userId,
        note,
      },
    });

    return publishedVersion;
  });
};

export const workflowRouter = createTRPCRouter({
  execute: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: input.id },
        include: { publishedVersion: true },
      });

      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: workflow.workspaceId,
        minRole: WorkspaceRole.EDITOR,
      });

      if (!workflow.publishedVersionId || !workflow.publishedVersion) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Workflow must be published before execution',
        });
      }

      await sendWorkflowExecution({
        workflowId: input.id,
        workflowVersionId: workflow.publishedVersionId,
        workspaceId: workflow.workspaceId,
      });
      return workflow;
    }),

  create: protectedProcedure
    .input(
      z
        .object({ workspaceId: z.string().optional(), name: z.string().min(1).optional() })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const workspaceId = input?.workspaceId ?? ctx.workspaceId;
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId,
        minRole: WorkspaceRole.EDITOR,
      });

      const name = input?.name ?? generateSlug(3);
      const nodes = [initialNode()];

      return prisma.$transaction(async tx => {
        const workflow = await tx.workflow.create({
          data: {
            name,
            userId: ctx.auth.user.id,
            workspaceId,
            nodes: {
              create: {
                id: nodes[0].id,
                type: NodeType.INITIAL,
                position: nodes[0].position,
                name: NodeType.INITIAL,
                data: {},
              },
            },
          },
        });

        const draftVersion = await tx.workflowVersion.create({
          data: {
            workflowId: workflow.id,
            version: 1,
            name,
            nodes: asJson(nodes),
            connections: asJson(emptyEdges),
            status: WorkflowVersionStatus.DRAFT,
            createdBy: ctx.auth.user.id,
          },
        });

        return tx.workflow.update({
          where: { id: workflow.id },
          data: { draftVersionId: draftVersion.id },
          include: { draftVersion: true },
        });
      });
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await prisma.workflow.findUniqueOrThrow({ where: { id: input.id } });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: workflow.workspaceId,
        minRole: WorkspaceRole.OWNER,
      });

      return prisma.workflow.delete({ where: { id: input.id } });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        nodes: z.array(
          z.object({
            id: z.string(),
            type: z.string().nullish(),
            position: z.object({ x: z.number(), y: z.number() }),
            data: z.record(z.string(), z.any()).optional(),
          }),
        ),
        edges: z.array(
          z.object({
            source: z.string(),
            target: z.string(),
            sourceHandle: z.string().nullish(),
            targetHandle: z.string().nullish(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, nodes, edges } = input;
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id },
        include: { draftVersion: true },
      });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: workflow.workspaceId,
        minRole: WorkspaceRole.EDITOR,
      });

      return prisma.$transaction(async tx => {
        await tx.connection.deleteMany({ where: { workflowId: id } });
        await tx.node.deleteMany({ where: { workflowId: id } });
        await tx.node.createMany({
          data: nodes.map(node => {
            const data = asRecord(node.data);

            return {
              id: node.id,
              workflowId: id,
              name: node.type || 'unknown',
              type: node.type as NodeType,
              position: node.position,
              data: asJson(data),
              retryEnabled: data.retryEnabled === true,
              retryMaxAttempts: asNumber(data.retryMaxAttempts, 1),
              retryStrategy: asRetryStrategy(data.retryStrategy) ?? undefined,
              retryBaseDelayMs: asNumber(data.retryBaseDelayMs, 1000),
              retryMaxDelayMs: asNumber(data.retryMaxDelayMs, 30000),
              credentialId:
                typeof data.credentialId === 'string' && data.credentialId
                  ? data.credentialId
                  : undefined,
            };
          }),
        });

        await tx.connection.createMany({
          data: edges.map(edge => ({
            workflowId: id,
            fromNodeId: edge.source,
            toNodeId: edge.target,
            fromOutput: edge.sourceHandle || 'main',
            toInput: edge.targetHandle || 'main',
          })),
        });

        const currentDraft = workflow.draftVersion ?? (await getDraftVersion(id));
        const canUpdateCurrentDraft = currentDraft?.status === WorkflowVersionStatus.DRAFT;

        const draftVersion = canUpdateCurrentDraft
          ? await tx.workflowVersion.update({
              where: { id: currentDraft.id },
              data: {
                name: workflow.name,
                nodes: asJson(nodes),
                connections: asJson(edges),
              },
            })
          : await tx.workflowVersion.create({
              data: {
                workflowId: id,
                version:
                  ((
                    await tx.workflowVersion.aggregate({
                      where: { workflowId: id },
                      _max: { version: true },
                    })
                  )._max.version ?? 0) + 1,
                name: workflow.name,
                nodes: asJson(nodes),
                connections: asJson(edges),
                status: WorkflowVersionStatus.DRAFT,
                createdBy: ctx.auth.user.id,
              },
            });

        return tx.workflow.update({
          where: { id },
          data: {
            draftVersionId: draftVersion.id,
            updatedAt: new Date(),
          },
        });
      });
    }),

  updateName: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: input.id },
        include: { draftVersion: true },
      });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: workflow.workspaceId,
        minRole: WorkspaceRole.EDITOR,
      });

      return prisma.$transaction(async tx => {
        if (workflow.draftVersion?.status === WorkflowVersionStatus.DRAFT) {
          await tx.workflowVersion.update({
            where: { id: workflow.draftVersion.id },
            data: { name: input.name },
          });
        }

        return tx.workflow.update({
          where: { id: input.id },
          data: { name: input.name },
        });
      });
    }),

  submitReview: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .mutation(async ({ ctx, input }) => {
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
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Workflow has no draft to submit' });
      }

      return prisma.workflowVersion.update({
        where: { id: workflow.draftVersion.id },
        data: { status: WorkflowVersionStatus.PENDING_REVIEW },
      });
    }),

  approve: protectedProcedure
    .input(z.object({ workflowId: z.string(), note: z.string().optional() }))
    .mutation(({ ctx, input }) =>
      approveWorkflowVersion({
        workflowId: input.workflowId,
        userId: ctx.auth.user.id,
        note: input.note,
      }),
    ),

  publish: protectedProcedure
    .input(z.object({ workflowId: z.string(), note: z.string().optional() }))
    .mutation(({ ctx, input }) =>
      approveWorkflowVersion({
        workflowId: input.workflowId,
        userId: ctx.auth.user.id,
        note: input.note,
      }),
    ),

  reject: protectedProcedure
    .input(z.object({ workflowId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: input.workflowId },
        include: { draftVersion: true },
      });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: workflow.workspaceId,
        minRole: WorkspaceRole.OWNER,
      });

      if (
        !workflow.draftVersion ||
        workflow.draftVersion.status !== WorkflowVersionStatus.PENDING_REVIEW
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Workflow has no pending review version',
        });
      }

      return prisma.workflowVersion.update({
        where: { id: workflow.draftVersion.id },
        data: { status: WorkflowVersionStatus.REJECTED },
      });
    }),

  reopenRejected: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: input.workflowId },
        include: { draftVersion: true },
      });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: workflow.workspaceId,
        minRole: WorkspaceRole.EDITOR,
      });

      if (
        !workflow.draftVersion ||
        workflow.draftVersion.status !== WorkflowVersionStatus.REJECTED
      ) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Workflow has no rejected draft' });
      }

      return prisma.workflowVersion.update({
        where: { id: workflow.draftVersion.id },
        data: { status: WorkflowVersionStatus.DRAFT },
      });
    }),

  getOne: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const workflow = await prisma.workflow.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        draftVersion: true,
        publishedVersion: true,
        versions: { orderBy: { version: 'desc' } },
        nodes: true,
        connections: true,
      },
    });
    const membership = await requireWorkspaceRole({
      userId: ctx.auth.user.id,
      workspaceId: workflow.workspaceId,
      minRole: WorkspaceRole.VIEWER,
    });

    const draft = workflow.draftVersion ?? workflow.versions[0];
    const versionNodes =
      (draft?.nodes as Array<{
        id: string;
        type: string;
        position: unknown;
        data: unknown;
      }> | null) ?? workflow.nodes;
    const versionEdges =
      (draft?.connections as Array<{
        source: string;
        target: string;
        sourceHandle?: string;
        targetHandle?: string;
      }> | null) ?? workflow.connections;

    const nodes: Node[] = versionNodes.map(toEditorNode);
    const edges: Edge[] = versionEdges.map(toEditorEdge);

    return {
      id: workflow.id,
      workspaceId: workflow.workspaceId,
      name: workflow.name,
      draftVersion: workflow.draftVersion,
      publishedVersion: workflow.publishedVersion,
      versions: workflow.versions,
      currentUserRole: membership.role,
      nodes,
      edges,
    };
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
        search: z.string().default(''),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;
      const workspaceId = input.workspaceId ?? ctx.workspaceId;
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });

      const where = {
        workspaceId,
        name: {
          contains: search,
          mode: 'insensitive' as const,
        },
      };

      const [items, totalCount] = await Promise.all([
        prisma.workflow.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where,
          orderBy: {
            updatedAt: 'desc',
          },
          include: {
            draftVersion: true,
            publishedVersion: true,
          },
        }),
        prisma.workflow.count({ where }),
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
});
