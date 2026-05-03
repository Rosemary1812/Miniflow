import { createTRPCRouter, protectedProcedure } from '@/app/trpc/init';
import prisma from '@/lib/db';
import { requireWorkspaceRole } from '@/lib/workspace';
import z from 'zod';
import { createId } from '@paralleldrive/cuid2';
import type { Node } from '@xyflow/react';
import { NodeType, Prisma, WorkflowVersionStatus, WorkspaceRole } from '@prisma/client';

// Connection data stored in DB (after transformation by seed.ts)
interface ConnectionData {
  fromNodeId: string;
  toNodeId: string;
  fromOutput: string;
  toInput: string;
}

// Map NodeType enum values to readable display names
const NODE_TYPE_LABELS: Record<NodeType, string> = {
  INITIAL: 'Start',
  MANUAL_TRIGGER: 'Manual Trigger',
  HTTP_REQUEST: 'HTTP Request',
  GOOGLE_FORM_TRIGGER: 'Google Form',
  STRIPE_TRIGGER: 'Stripe',
  ANTHROPIC: 'Anthropic',
  GEMINI: 'Gemini',
  OPENAI: 'OpenAI',
  DISCORD: 'Discord',
  SLACK: 'Slack',
  IF_BRANCH: 'If / Else',
  SCHEDULE_TRIGGER: 'Schedule',
};

export const templateRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return prisma.workflowTemplate.findMany({
        where: {
          ...(input.category && { category: input.category }),
          ...(input.search && {
            name: { contains: input.search, mode: 'insensitive' },
          }),
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  createFromTemplate: protectedProcedure
    .input(z.object({ templateId: z.string(), name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const template = await prisma.workflowTemplate.findUniqueOrThrow({
        where: { id: input.templateId },
      });

      const nodes = template.nodes as unknown as Node[];
      // seed.ts already transforms Edge format to Connection format
      const edges = template.edges as unknown as ConnectionData[];

      // Generate new IDs to avoid conflicts
      const idMap = new Map<string, string>();
      const newNodes = nodes.map(node => {
        const newId = createId();
        idMap.set(node.id, newId);
        return {
          id: newId,
          // Use readable name from type enum, fallback to type value
          name:
            node.type && node.type in NODE_TYPE_LABELS
              ? NODE_TYPE_LABELS[node.type as NodeType]
              : node.type || 'Node',
          type: node.type || 'unknown',
          position: node.position,
          data: node.data || {},
        };
      });

      const newEdges = edges.map(edge => ({
        id: createId(),
        fromNodeId: idMap.get(edge.fromNodeId) || edge.fromNodeId,
        toNodeId: idMap.get(edge.toNodeId) || edge.toNodeId,
        fromOutput: edge.fromOutput,
        toInput: edge.toInput,
      }));

      await requireWorkspaceRole({
        userId: ctx.auth.user.id,
        workspaceId: ctx.workspaceId,
        minRole: WorkspaceRole.EDITOR,
      });

      return prisma.$transaction(async tx => {
        const workflow = await tx.workflow.create({
          data: {
            name: input.name || template.name,
            userId: ctx.auth.user.id,
            workspaceId: ctx.workspaceId,
            nodes: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              create: newNodes as any,
            },
            connections: {
              create: newEdges,
            },
          },
        });

        const draftVersion = await tx.workflowVersion.create({
          data: {
            workflowId: workflow.id,
            version: 1,
            name: workflow.name,
            nodes: JSON.parse(
              JSON.stringify(
                newNodes.map(node => ({
                  id: node.id,
                  type: node.type,
                  position: node.position,
                  data: node.data,
                })),
              ),
            ) as Prisma.InputJsonValue,
            connections: JSON.parse(
              JSON.stringify(
                newEdges.map(edge => ({
                  id: edge.id,
                  source: edge.fromNodeId,
                  target: edge.toNodeId,
                  sourceHandle: edge.fromOutput,
                  targetHandle: edge.toInput,
                })),
              ),
            ) as Prisma.InputJsonValue,
            status: WorkflowVersionStatus.DRAFT,
            createdBy: ctx.auth.user.id,
          },
        });

        return tx.workflow.update({
          where: { id: workflow.id },
          data: { draftVersionId: draftVersion.id },
        });
      });
    }),
});
