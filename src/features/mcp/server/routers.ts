import { createTRPCRouter, protectedProcedure } from '@/app/trpc/init';
import prisma from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { requireWorkspaceRole } from '@/lib/workspace';
import { McpAuthType, Prisma, WorkspaceRole } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import z from 'zod';
import { listMcpTools } from './client';
import { normalizeMcpUrl, validateAuthHeaderName } from './validation';

const serverInput = z.object({
  workspaceId: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  url: z.string().min(1, 'URL is required'),
  authType: z.enum(McpAuthType),
  secret: z.string().optional(),
  authHeaderName: z.string().optional(),
  enabled: z.boolean().optional(),
});

const getSecretData = ({
  authType,
  secret,
}: {
  authType: McpAuthType;
  secret?: string;
}): { encryptedSecret: string | null; iv: string | null } => {
  if (authType === McpAuthType.NONE) {
    return { encryptedSecret: null, iv: null };
  }

  if (!secret) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Secret is required for authenticated MCP servers',
    });
  }

  const encrypted = encrypt(secret);
  return { encryptedSecret: encrypted.encryptedValue, iv: encrypted.iv };
};

export const mcpServersRouter = createTRPCRouter({
  create: protectedProcedure.input(serverInput).mutation(async ({ ctx, input }) => {
    const workspaceId = input.workspaceId ?? ctx.workspaceId;
    await requireWorkspaceRole({
      userId: ctx.auth.user.id,
      workspaceId,
      minRole: WorkspaceRole.EDITOR,
    });

    const url = normalizeMcpUrl(input.url);
    const secretData = getSecretData({ authType: input.authType, secret: input.secret });
    const authHeaderName =
      input.authType === McpAuthType.HEADER ? validateAuthHeaderName(input.authHeaderName) : null;

    return prisma.mcpServer.create({
      data: {
        workspaceId,
        name: input.name,
        url,
        authType: input.authType,
        encryptedSecret: secretData.encryptedSecret,
        iv: secretData.iv,
        authHeaderName,
        enabled: input.enabled ?? true,
        createdBy: ctx.auth.user.id,
      },
    });
  }),

  update: protectedProcedure
    .input(serverInput.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const server = await prisma.mcpServer.findUniqueOrThrow({ where: { id: input.id } });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: server.workspaceId,
        minRole: WorkspaceRole.EDITOR,
      });

      const url = normalizeMcpUrl(input.url);
      const authHeaderName =
        input.authType === McpAuthType.HEADER ? validateAuthHeaderName(input.authHeaderName) : null;
      const nextSecret =
        input.authType === McpAuthType.NONE
          ? { encryptedSecret: null, iv: null }
          : input.secret
            ? getSecretData({ authType: input.authType, secret: input.secret })
            : { encryptedSecret: server.encryptedSecret, iv: server.iv };

      if (input.authType !== McpAuthType.NONE && !nextSecret.encryptedSecret) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Secret is required for authenticated MCP servers',
        });
      }

      return prisma.mcpServer.update({
        where: { id: input.id },
        data: {
          name: input.name,
          url,
          authType: input.authType,
          encryptedSecret: nextSecret.encryptedSecret,
          iv: nextSecret.iv,
          authHeaderName,
          enabled: input.enabled ?? server.enabled,
        },
      });
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const server = await prisma.mcpServer.findUniqueOrThrow({ where: { id: input.id } });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: server.workspaceId,
        minRole: WorkspaceRole.OWNER,
      });

      return prisma.mcpServer.delete({ where: { id: input.id } });
    }),

  getMany: protectedProcedure
    .input(z.object({ workspaceId: z.string().optional(), search: z.string().default('') }))
    .query(async ({ ctx, input }) => {
      const workspaceId = input.workspaceId ?? ctx.workspaceId;
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });

      const items = await prisma.mcpServer.findMany({
        where: {
          workspaceId,
          name: {
            contains: input.search,
            mode: 'insensitive',
          },
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { tools: true },
          },
        },
      });

      return {
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          transport: item.transport,
          url: item.url,
          authType: item.authType,
          authHeaderName: item.authHeaderName,
          enabled: item.enabled,
          lastCheckedAt: item.lastCheckedAt,
          lastError: item.lastError,
          toolCount: item._count.tools,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      };
    }),

  getOne: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const server = await prisma.mcpServer.findUniqueOrThrow({ where: { id: input.id } });
    await requireWorkspaceRole({
      userId: ctx.auth.user.id,
      workspaceId: server.workspaceId,
      minRole: WorkspaceRole.VIEWER,
    });

    return {
      id: server.id,
      name: server.name,
      transport: server.transport,
      url: server.url,
      authType: server.authType,
      authHeaderName: server.authHeaderName,
      enabled: server.enabled,
      lastCheckedAt: server.lastCheckedAt,
      lastError: server.lastError,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
    };
  }),

  syncTools: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const server = await prisma.mcpServer.findUniqueOrThrow({ where: { id: input.id } });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: server.workspaceId,
        minRole: WorkspaceRole.EDITOR,
      });

      if (!server.enabled) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'MCP server is disabled' });
      }

      try {
        const tools = await listMcpTools(server);
        const syncedAt = new Date();

        await prisma.$transaction(async tx => {
          await tx.mcpToolCache.deleteMany({
            where: {
              mcpServerId: server.id,
              name: {
                notIn: tools.map(tool => tool.name),
              },
            },
          });

          for (const tool of tools) {
            await tx.mcpToolCache.upsert({
              where: {
                mcpServerId_name: {
                  mcpServerId: server.id,
                  name: tool.name,
                },
              },
              create: {
                workspaceId: server.workspaceId,
                mcpServerId: server.id,
                name: tool.name,
                description: tool.description,
                inputSchema: (tool.inputSchema ?? Prisma.JsonNull) as Prisma.InputJsonValue,
                lastSyncedAt: syncedAt,
              },
              update: {
                workspaceId: server.workspaceId,
                description: tool.description,
                inputSchema: (tool.inputSchema ?? Prisma.JsonNull) as Prisma.InputJsonValue,
                lastSyncedAt: syncedAt,
              },
            });
          }

          await tx.mcpServer.update({
            where: { id: server.id },
            data: {
              lastCheckedAt: syncedAt,
              lastError: null,
            },
          });
        });

        return { count: tools.length };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sync MCP tools';
        await prisma.mcpServer.update({
          where: { id: server.id },
          data: {
            lastCheckedAt: new Date(),
            lastError: message,
          },
        });
        throw new TRPCError({ code: 'BAD_REQUEST', message });
      }
    }),
});

export const mcpToolsRouter = createTRPCRouter({
  getByServer: protectedProcedure
    .input(z.object({ mcpServerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const server = await prisma.mcpServer.findUniqueOrThrow({
        where: { id: input.mcpServerId },
      });
      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: server.workspaceId,
        minRole: WorkspaceRole.VIEWER,
      });

      return prisma.mcpToolCache.findMany({
        where: {
          mcpServerId: server.id,
          workspaceId: server.workspaceId,
        },
        orderBy: { name: 'asc' },
      });
    }),
});
