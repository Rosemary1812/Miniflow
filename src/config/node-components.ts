import { NodeType } from '@prisma/client';
import type { NodeTypes } from '@xyflow/react';
import { InitialNode } from '@/components/initial-node';
import { HttpRequestNode } from '@/features/executions/components/http-request/node';
import { ManualTriggerNode } from '@/features/triggers/components/manual-trigger/node';
import { GoogleFormTrigger } from '@/features/triggers/components/google-form-trigger/node';
import { StripeTriggerNode } from '@/features/triggers/components/stripe-trigger/node';
import { AiTextNode } from '@/features/executions/components/ai-text/node';
import { DiscordNode } from '@/features/executions/components/discord/node';
import { SlackNode } from '@/features/executions/components/slack/node';
import { IfBranchNode } from '@/features/executions/components/if-branch/node';
import { ScheduleTriggerNode } from '@/features/triggers/components/schedule-trigger/node';
import { McpToolNode } from '@/features/executions/components/mcp-tool/node';
import { KnowledgeRetrievalNode } from '@/features/executions/components/knowledge-retrieval/node';

export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTrigger,
  [NodeType.STRIPE_TRIGGER]: StripeTriggerNode,
  [NodeType.AI_TEXT]: AiTextNode,
  [NodeType.DISCORD]: DiscordNode,
  [NodeType.SLACK]: SlackNode,
  [NodeType.IF_BRANCH]: IfBranchNode,
  [NodeType.SCHEDULE_TRIGGER]: ScheduleTriggerNode,
  [NodeType.MCP_TOOL]: McpToolNode,
  [NodeType.KNOWLEDGE_RETRIEVAL]: KnowledgeRetrievalNode,
} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;
