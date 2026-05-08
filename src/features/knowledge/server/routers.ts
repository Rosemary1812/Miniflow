import { createTRPCRouter, protectedProcedure } from '@/app/trpc/init';
import prisma from '@/lib/db';
import { requireWorkspaceRole } from '@/lib/workspace';
import { inngest } from '@/inngest/client';
import { KnowledgeDocumentStatus, WorkspaceRole } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import z from 'zod';
import { retrieveKnowledge } from '../lib/retrieval';

const variableNameSchema = z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/);

const assertKnowledgeBaseAccess = async ({
  userId,
  knowledgeBaseId,
  minRole,
}: {
  userId: string;
  knowledgeBaseId: string;
  minRole: WorkspaceRole;
}) => {
  const knowledgeBase = await prisma.knowledgeBase.findUniqueOrThrow({
    where: { id: knowledgeBaseId },
  });
  await requireWorkspaceRole({ userId, workspaceId: knowledgeBase.workspaceId, minRole });
  return knowledgeBase;
};

const enqueueDocumentProcessing = async (documentId: string) => {
  await inngest.send({
    name: 'knowledge/process-document',
    data: { documentId },
  });
};

export const knowledgeBasesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspaceId = input.workspaceId ?? ctx.workspaceId;
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId,
        minRole: WorkspaceRole.EDITOR,
      });

      return prisma.knowledgeBase.create({
        data: {
          workspaceId,
          name: input.name,
          description: input.description || null,
        },
      });
    }),

  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().optional(), search: z.string().default('') }))
    .query(async ({ ctx, input }) => {
      const workspaceId = input.workspaceId ?? ctx.workspaceId;
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });

      const items = await prisma.knowledgeBase.findMany({
        where: {
          workspaceId,
          name: { contains: input.search, mode: 'insensitive' },
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { documents: true, chunks: true } },
        },
      });

      return {
        items: items.map(item => ({
          ...item,
          documentCount: item._count.documents,
          chunkCount: item._count.chunks,
        })),
      };
    }),

  getOne: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const knowledgeBase = await prisma.knowledgeBase.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        _count: { select: { documents: true, chunks: true } },
      },
    });
    const membership = await requireWorkspaceRole({
      userId: ctx.auth.user.id,
      workspaceId: knowledgeBase.workspaceId,
      minRole: WorkspaceRole.VIEWER,
    });

    return {
      ...knowledgeBase,
      currentUserRole: membership.role,
      documentCount: knowledgeBase._count.documents,
      chunkCount: knowledgeBase._count.chunks,
    };
  }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const knowledgeBase = await assertKnowledgeBaseAccess({
        userId: ctx.auth.user.id,
        knowledgeBaseId: input.id,
        minRole: WorkspaceRole.EDITOR,
      });

      return prisma.knowledgeBase.update({
        where: { id: knowledgeBase.id },
        data: {
          name: input.name,
          description: input.description || null,
        },
      });
    }),

  remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const knowledgeBase = await assertKnowledgeBaseAccess({
      userId: ctx.auth.user.id,
      knowledgeBaseId: input.id,
      minRole: WorkspaceRole.OWNER,
    });

    return prisma.knowledgeBase.delete({ where: { id: knowledgeBase.id } });
  }),
});

export const knowledgeDocumentsRouter = createTRPCRouter({
  createText: protectedProcedure
    .input(
      z.object({
        knowledgeBaseId: z.string(),
        title: z.string().min(1),
        text: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const knowledgeBase = await assertKnowledgeBaseAccess({
        userId: ctx.auth.user.id,
        knowledgeBaseId: input.knowledgeBaseId,
        minRole: WorkspaceRole.EDITOR,
      });

      const document = await prisma.knowledgeDocument.create({
        data: {
          workspaceId: knowledgeBase.workspaceId,
          knowledgeBaseId: knowledgeBase.id,
          title: input.title,
          sourceText: input.text,
          status: KnowledgeDocumentStatus.PENDING,
        },
      });

      await enqueueDocumentProcessing(document.id);
      return document;
    }),

  list: protectedProcedure
    .input(z.object({ knowledgeBaseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const knowledgeBase = await assertKnowledgeBaseAccess({
        userId: ctx.auth.user.id,
        knowledgeBaseId: input.knowledgeBaseId,
        minRole: WorkspaceRole.VIEWER,
      });

      return prisma.knowledgeDocument.findMany({
        where: {
          workspaceId: knowledgeBase.workspaceId,
          knowledgeBaseId: knowledgeBase.id,
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          workspaceId: true,
          knowledgeBaseId: true,
          title: true,
          sourceType: true,
          status: true,
          error: true,
          chunkCount: true,
          createdAt: true,
          updatedAt: true,
          processedAt: true,
        },
      });
    }),

  getOne: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const document = await prisma.knowledgeDocument.findUniqueOrThrow({ where: { id: input.id } });
    await requireWorkspaceRole({
      userId: ctx.auth.user.id,
      workspaceId: document.workspaceId,
      minRole: WorkspaceRole.VIEWER,
    });
    return document;
  }),

  remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const document = await prisma.knowledgeDocument.findUniqueOrThrow({ where: { id: input.id } });
    await requireWorkspaceRole({
      userId: ctx.auth.user.id,
      workspaceId: document.workspaceId,
      minRole: WorkspaceRole.EDITOR,
    });

    return prisma.knowledgeDocument.delete({ where: { id: document.id } });
  }),

  reprocess: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const document = await prisma.knowledgeDocument.findUniqueOrThrow({ where: { id: input.id } });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: document.workspaceId,
        minRole: WorkspaceRole.EDITOR,
      });

      await prisma.$transaction([
        prisma.knowledgeChunk.deleteMany({ where: { documentId: document.id } }),
        prisma.knowledgeDocument.update({
          where: { id: document.id },
          data: {
            status: KnowledgeDocumentStatus.PENDING,
            error: null,
            chunkCount: 0,
            processedAt: null,
          },
        }),
      ]);
      await enqueueDocumentProcessing(document.id);
      return { id: document.id };
    }),
});

export const knowledgeChunksRouter = createTRPCRouter({
  listByDocument: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const document = await prisma.knowledgeDocument.findUniqueOrThrow({
        where: { id: input.documentId },
      });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: document.workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });

      return prisma.knowledgeChunk.findMany({
        where: { documentId: document.id },
        orderBy: { index: 'asc' },
        select: {
          id: true,
          workspaceId: true,
          knowledgeBaseId: true,
          documentId: true,
          index: true,
          content: true,
          tokenCount: true,
          metadata: true,
          embeddingModel: true,
          embeddingProvider: true,
          createdAt: true,
        },
      });
    }),
});

export const knowledgeRetrievalRouter = createTRPCRouter({
  test: protectedProcedure
    .input(
      z.object({
        knowledgeBaseIds: z.array(z.string()).min(1),
        query: z.string().min(1),
        topK: z.number().int().min(1).max(20).default(5),
        scoreThreshold: z.number().min(-1).max(1).default(0.25),
        variableName: variableNameSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const bases = await prisma.knowledgeBase.findMany({
        where: {
          id: { in: input.knowledgeBaseIds },
          workspaceId: ctx.workspaceId,
        },
        select: { id: true },
      });

      if (bases.length !== input.knowledgeBaseIds.length) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'One or more knowledge bases are not available in this workspace',
        });
      }

      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: ctx.workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });

      const result = await retrieveKnowledge({
        workspaceId: ctx.workspaceId,
        knowledgeBaseIds: input.knowledgeBaseIds,
        query: input.query,
        topK: input.topK,
        scoreThreshold: input.scoreThreshold,
      });

      return {
        query: input.query,
        result,
      };
    }),
});
