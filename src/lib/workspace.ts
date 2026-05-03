import prisma from '@/lib/db';
import { TRPCError } from '@trpc/server';
import { WorkspaceRole } from '@prisma/client';
import { generateSlug } from 'random-word-slugs';

const roleRank: Record<WorkspaceRole, number> = {
  VIEWER: 0,
  EDITOR: 1,
  OWNER: 2,
};

export const ensureDefaultWorkspace = async (user: {
  id: string;
  name?: string | null;
  email?: string | null;
}) => {
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { defaultWorkspaceId: true },
  });

  if (userRecord?.defaultWorkspaceId) {
    const defaultMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: userRecord.defaultWorkspaceId,
          userId: user.id,
        },
      },
      include: { workspace: true },
    });

    if (defaultMembership) {
      return defaultMembership;
    }
  }

  const existing = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
    include: { workspace: true },
  });

  if (existing) {
    return existing;
  }

  const baseName = user.name || user.email?.split('@')[0] || 'My Workspace';
  const slug = `${generateSlug(2)}-${Date.now().toString(36)}`;

  const workspace = await prisma.workspace.create({
    data: {
      name: baseName,
      slug,
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: WorkspaceRole.OWNER,
        },
      },
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { defaultWorkspaceId: workspace.id },
  });

  return prisma.workspaceMember.findUniqueOrThrow({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    include: { workspace: true },
  });
};

export const requireWorkspaceRole = async ({
  userId,
  workspaceId,
  minRole,
}: {
  userId: string;
  workspaceId: string;
  minRole: WorkspaceRole;
}) => {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  if (!member) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You are not a member of this workspace',
    });
  }

  if (roleRank[member.role] < roleRank[minRole]) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `${minRole} role required`,
    });
  }

  return member;
};

export const assertWorkspaceResource = async ({
  userId,
  workspaceId,
  minRole,
}: {
  userId: string;
  workspaceId: string;
  minRole: WorkspaceRole;
}) => {
  return requireWorkspaceRole({ userId, workspaceId, minRole });
};
