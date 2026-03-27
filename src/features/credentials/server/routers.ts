import { createTRPCRouter, premiumProcedure, protectedProcedure } from '@/app/trpc/init';
import { PAGINATION } from '@/config/constants';
import prisma from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';
import { CredentialType } from '@prisma/client';
import z from 'zod';

// Exclude sensitive fields from list responses
type CredentialListItem = {
  id: string;
  name: string;
  type: CredentialType;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

// For form display/edit (decrypted)
type CredentialWithValue = {
  id: string;
  name: string;
  type: CredentialType;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  encryptedValue: string;
  iv: string;
  keyVersion: number;
  value: string;
};

export const credentialsRouter = createTRPCRouter({
  create: premiumProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        type: z.enum(CredentialType),
        value: z.string().min(1, 'Value is required'),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { name, value, type } = input;
      const { encryptedValue, iv } = encrypt(value);

      return prisma.credential.create({
        data: {
          name,
          userId: ctx.auth.user.id,
          type,
          encryptedValue,
          iv,
        },
      });
    }),
  remove: protectedProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
    return prisma.credential.delete({
      where: {
        id: input.id,
        userId: ctx.auth.user.id,
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
      const { encryptedValue, iv } = encrypt(value);

      return prisma.credential.update({
        where: { id, userId: ctx.auth.user.id },
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
          userId: ctx.auth.user.id,
        },
      });
      if (!cred) return null;
      return {
        id: cred.id,
        name: cred.name,
        type: cred.type,
        createdAt: cred.createdAt,
        updatedAt: cred.updatedAt,
        userId: cred.userId,
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
        search: z.string().default(''),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;
      const [items, totalCount] = await Promise.all([
        prisma.credential.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            userId: ctx.auth.user.id,
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
          },
        }),
        prisma.credential.count({
          where: {
            userId: ctx.auth.user.id,
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
    .query(({ ctx, input }) => {
      const { type } = input;
      return prisma.credential.findMany({
        where: {
          userId: ctx.auth.user.id,
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
