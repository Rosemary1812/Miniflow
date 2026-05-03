import { createTRPCRouter, protectedProcedure } from '@/app/trpc/init';
import { PAGINATION } from '@/config/constants';
import prisma from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';
import { requireWorkspaceRole } from '@/lib/workspace';
import { CredentialType, WorkspaceRole } from '@prisma/client';
import z from 'zod';

// Exclude sensitive fields from list responses
type CredentialListItem = {
  id: string;
  name: string;
  type: CredentialType;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  workspaceId: string;
};

// For form display/edit (decrypted)
type CredentialWithValue = {
  id: string;
  name: string;
  type: CredentialType;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  workspaceId: string;
  encryptedValue: string;
  iv: string;
  keyVersion: number;
  value: string;
};

export const credentialsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        workspaceId: z.string().optional(),
        type: z.enum(CredentialType),
        value: z.string().min(1, 'Value is required'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name, value, type } = input;
      const workspaceId = input.workspaceId ?? ctx.workspaceId;
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId,
        minRole: WorkspaceRole.EDITOR,
      });
      const { encryptedValue, iv } = encrypt(value);

      return prisma.credential.create({
        data: {
          name,
          workspaceId,
          userId: ctx.auth.user.id,
          type,
          encryptedValue,
          iv,
        },
      });
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const credential = await prisma.credential.findUniqueOrThrow({ where: { id: input.id } });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: credential.workspaceId,
        minRole: WorkspaceRole.OWNER,
      });
      return prisma.credential.delete({
        where: {
          id: input.id,
        },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, 'Name is required'),
        type: z.enum(CredentialType),
        value: z.string().min(1, 'Value is required'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, type, value } = input;
      const credential = await prisma.credential.findUniqueOrThrow({ where: { id } });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: credential.workspaceId,
        minRole: WorkspaceRole.EDITOR,
      });
      const { encryptedValue, iv } = encrypt(value);

      return prisma.credential.update({
        where: { id },
        data: {
          name,
          type,
          encryptedValue,
          iv,
        },
      });
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }): Promise<CredentialWithValue | null> => {
      const cred = await prisma.credential.findUnique({
        where: {
          id: input.id,
        },
      });
      if (!cred) return null;
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: cred.workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });
      return {
        id: cred.id,
        name: cred.name,
        type: cred.type,
        createdAt: cred.createdAt,
        updatedAt: cred.updatedAt,
        userId: cred.userId,
        workspaceId: cred.workspaceId,
        encryptedValue: cred.encryptedValue,
        iv: cred.iv,
        keyVersion: cred.keyVersion,
        value: decrypt(cred.encryptedValue, cred.iv),
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
      const [items, totalCount] = await Promise.all([
        prisma.credential.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            workspaceId,
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
          select: {
            id: true,
            name: true,
            type: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
            workspaceId: true,
          },
        }),
        prisma.credential.count({
          where: {
            workspaceId,
          },
        }),
      ]);
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        items: items as CredentialListItem[],
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNestPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }),
  getByType: protectedProcedure
    .input(z.object({ type: z.enum(CredentialType) }))
    .query(async ({ ctx, input }) => {
      const { type } = input;
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: ctx.workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });
      return prisma.credential.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          type,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        select: {
          id: true,
          name: true,
        },
      });
    }),
});
