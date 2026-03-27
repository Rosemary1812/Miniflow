import { NodeType } from '@prisma/client';
import type { NodeTypes } from '@xyflow/react';
import { InitialNode } from '@/components/initial-node';
import { HttpRequestNode } from '@/features/executions/components/http-request/node';
import { ManualTriggerNode } from '@/features/triggers/components/manual-trigger/node';
import { GoogleFormTrigger } from '@/features/triggers/components/google-form-trigger/node';
import { StripeTriggerNode } from '@/features/triggers/components/stripe-trigger/node';
import { GeminiNode } from '@/features/executions/components/gemini/node';
import { OpenAINode } from '@/features/executions/components/openai/node';
import { AnthropicNode } from '@/features/executions/components/anthropic/node';
import { DiscordNode } from '@/features/executions/components/discord/node';
import { SlackNode } from '@/features/executions/components/slack/node';
import { IfBranchNode } from '@/features/executions/components/if-branch/node';
import { ScheduleTriggerNode } from '@/features/triggers/components/schedule-trigger/node';

export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTrigger,
  [NodeType.STRIPE_TRIGGER]: StripeTriggerNode,
  [NodeType.GEMINI]: GeminiNode,
  [NodeType.OPENAI]: OpenAINode,
  [NodeType.ANTHROPIC]: AnthropicNode,
  [NodeType.DISCORD]: DiscordNode,
  [NodeType.SLACK]: SlackNode,
  [NodeType.IF_BRANCH]: IfBranchNode,
  [NodeType.SCHEDULE_TRIGGER]: ScheduleTriggerNode,
} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;
