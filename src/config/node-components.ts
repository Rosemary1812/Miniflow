import { NodeType } from '@prisma/client';
import type { NodeTypes } from '@xyflow/react';
import { InitialNode } from '@/components/initial-node';
import { HttpRequestNode } from '@/features/exexutions/components/http-request/node';
import { ManualTriggerNode } from '@/features/triggers/components/manual-trigger/node';
import { GoogleFormTrigger } from '@/features/triggers/components/google-form-trigger/node';
import { StripeTriggerNode } from '@/features/triggers/components/stripe-trigger/node';
import { GeminiNode } from '@/features/exexutions/components/gemini/node';
import { OpenAINode } from '@/features/exexutions/components/openai/node';
import { AnthropicNode } from '@/features/exexutions/components/anthropic/node';

export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTrigger,
  [NodeType.STRIPE_TRIGGER]: StripeTriggerNode,
  [NodeType.GEMINI]: GeminiNode,
  [NodeType.OPENAI]: OpenAINode,
  [NodeType.ANTHROPIC]: AnthropicNode,
} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;
