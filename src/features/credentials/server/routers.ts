import { createTRPCRouter, protectedProcedure } from '@/app/trpc/init';
import { PAGINATION } from '@/config/constants';
import prisma from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';
import { requireWorkspaceRole } from '@/lib/workspace';
import { AiProviderKind, WorkspaceRole } from '@prisma/client';
import z from 'zod';

type AiProviderListItem = {
  id: string;
  name: string;
  provider: AiProviderKind;
  baseURL: string | null;
  defaultModel: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  workspaceId: string;
};

type AiProviderWithApiKey = AiProviderListItem & {
  apiKey: string;
};

const providerInput = z.object({
  name: z.string().min(1, 'Name is required'),
  workspaceId: z.string().optional(),
  provider: z.enum(AiProviderKind),
  baseURL: z.string().optional(),
  apiKey: z.string().min(1, 'API key is required'),
  defaultModel: z.string().optional(),
  enabled: z.boolean().default(true),
});

export const aiProvidersRouter = createTRPCRouter({
  create: protectedProcedure.input(providerInput).mutation(async ({ ctx, input }) => {
    const workspaceId = input.workspaceId ?? ctx.workspaceId;
    await requireWorkspaceRole({
      userId: ctx.auth.user.id,
      workspaceId,
      minRole: WorkspaceRole.EDITOR,
    });

    const { encryptedValue, iv } = encrypt(input.apiKey);

    return prisma.aiProviderProfile.create({
      data: {
        name: input.name,
        workspaceId,
        userId: ctx.auth.user.id,
        provider: input.provider,
        baseURL: input.baseURL || null,
        encryptedApiKey: encryptedValue,
        iv,
        defaultModel: input.defaultModel || null,
        enabled: input.enabled,
      },
    });
  }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await prisma.aiProviderProfile.findUniqueOrThrow({ where: { id: input.id } });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: profile.workspaceId,
        minRole: WorkspaceRole.OWNER,
      });

      return prisma.aiProviderProfile.delete({
        where: {
          id: input.id,
        },
      });
    }),

  update: protectedProcedure
    .input(
      providerInput.extend({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await prisma.aiProviderProfile.findUniqueOrThrow({ where: { id: input.id } });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: profile.workspaceId,
        minRole: WorkspaceRole.EDITOR,
      });

      const { encryptedValue, iv } = encrypt(input.apiKey);

      return prisma.aiProviderProfile.update({
        where: { id: input.id },
        data: {
          name: input.name,
          provider: input.provider,
          baseURL: input.baseURL || null,
          encryptedApiKey: encryptedValue,
          iv,
          defaultModel: input.defaultModel || null,
          enabled: input.enabled,
        },
      });
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }): Promise<AiProviderWithApiKey | null> => {
      const profile = await prisma.aiProviderProfile.findUnique({
        where: {
          id: input.id,
        },
      });
      if (!profile) return null;

      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: profile.workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });

      return {
        id: profile.id,
        name: profile.name,
        provider: profile.provider,
        baseURL: profile.baseURL,
        defaultModel: profile.defaultModel,
        enabled: profile.enabled,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        userId: profile.userId,
        workspaceId: profile.workspaceId,
        apiKey: decrypt(profile.encryptedApiKey, profile.iv),
      };
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
        workspaceId: z.string().optional(),
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
        prisma.aiProviderProfile.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where,
          orderBy: {
            updatedAt: 'desc',
          },
          select: {
            id: true,
            name: true,
            provider: true,
            baseURL: true,
            defaultModel: true,
            enabled: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
            workspaceId: true,
          },
        }),
        prisma.aiProviderProfile.count({
          where,
        }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        items: items as AiProviderListItem[],
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNestPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }),

  getEnabled: protectedProcedure.query(async ({ ctx }) => {
    await requireWorkspaceRole({
      userId: ctx.auth.user.id,
      workspaceId: ctx.workspaceId,
      minRole: WorkspaceRole.VIEWER,
    });

    return prisma.aiProviderProfile.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        enabled: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        provider: true,
        defaultModel: true,
        baseURL: true,
      },
    });
  }),
});
