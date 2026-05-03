import { createTRPCRouter, protectedProcedure } from '@/app/trpc/init';
import prisma from '@/lib/db';
import { requireWorkspaceRole } from '@/lib/workspace';
import { TRPCError } from '@trpc/server';
import { WorkspaceRole } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { generateSlug } from 'random-word-slugs';
import z from 'zod';

const roleSchema = z.enum(WorkspaceRole);

export const workspacesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const slug = `${generateSlug(2)}-${Date.now().toString(36)}`;

      return prisma.$transaction(async tx => {
        const workspace = await tx.workspace.create({
          data: {
            name: input.name,
            slug,
            ownerId: ctx.auth.user.id,
            members: {
              create: {
                userId: ctx.auth.user.id,
                role: WorkspaceRole.OWNER,
              },
            },
          },
        });

        await tx.user.update({
          where: { id: ctx.auth.user.id },
          data: { defaultWorkspaceId: workspace.id },
        });

        return workspace;
      });
    }),

  list: protectedProcedure.query(({ ctx }) => {
    return prisma.workspace.findMany({
      where: {
        members: {
          some: { userId: ctx.auth.user.id },
        },
      },
      include: {
        members: {
          where: { userId: ctx.auth.user.id },
          select: { role: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }),

  getCurrent: protectedProcedure.query(({ ctx }) => {
    return prisma.workspace.findUniqueOrThrow({
      where: { id: ctx.workspaceId },
      include: {
        members: {
          where: { userId: ctx.auth.user.id },
          select: { role: true },
        },
      },
    });
  }),

  switch: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: input.workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });

      await prisma.user.update({
        where: { id: ctx.auth.user.id },
        data: { defaultWorkspaceId: input.workspaceId },
      });

      return prisma.workspace.findUniqueOrThrow({ where: { id: input.workspaceId } });
    }),
});

export const workspaceMembersRouter = createTRPCRouter({
  invites: protectedProcedure
    .input(z.object({ workspaceId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const workspaceId = input?.workspaceId ?? ctx.workspaceId;
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });

      return prisma.workspaceInvite.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
      });
    }),

  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const workspaceId = input?.workspaceId ?? ctx.workspaceId;
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });

      return prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: {
          user: {
            select: { id: true, email: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    }),

  invite: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().optional(),
        email: z.string().email(),
        role: roleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspaceId = input.workspaceId ?? ctx.workspaceId;
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId,
        minRole: WorkspaceRole.OWNER,
      });

      return prisma.workspaceInvite.create({
        data: {
          workspaceId,
          email: input.email,
          role: input.role,
          token: createId(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdBy: ctx.auth.user.id,
        },
      });
    }),

  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await prisma.workspaceInvite.findUnique({
        where: { token: input.token },
      });

      if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invite is invalid or expired' });
      }

      if (invite.email.toLowerCase() !== ctx.auth.user.email.toLowerCase()) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This invite was issued for a different email address',
        });
      }

      const member = await prisma.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: invite.workspaceId,
            userId: ctx.auth.user.id,
          },
        },
        update: { role: invite.role },
        create: {
          workspaceId: invite.workspaceId,
          userId: ctx.auth.user.id,
          role: invite.role,
        },
      });

      await prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      return member;
    }),

  updateRole: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().optional(),
        userId: z.string(),
        role: roleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspaceId = input.workspaceId ?? ctx.workspaceId;
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId,
        minRole: WorkspaceRole.OWNER,
      });

      return prisma.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: input.userId,
          },
        },
        data: { role: input.role },
      });
    }),

  remove: protectedProcedure
    .input(z.object({ workspaceId: z.string().optional(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workspaceId = input.workspaceId ?? ctx.workspaceId;
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId,
        minRole: WorkspaceRole.OWNER,
      });

      return prisma.workspaceMember.delete({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: input.userId,
          },
        },
      });
    }),
});
