import Handlebars from 'handlebars';
import { ExecutionNodeStatus, NodeType } from '@prisma/client';
import type { Prisma } from '@prisma/client';

const sensitiveKeyPattern =
  /(api[-_ ]?key|token|secret|password|authorization|credential|encryptedValue|accessToken|refreshToken)/i;

export const redactSensitive = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactSensitive);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        sensitiveKeyPattern.test(key) ? '[REDACTED]' : redactSensitive(nested),
      ]),
    );
  }

  return value;
};

export const toJson = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(redactSensitive(value))) as Prisma.InputJsonValue;
};

export const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : String(error);
};

export const getErrorStack = (error: unknown) => {
  return error instanceof Error ? error.stack : undefined;
};

export const getDurationMs = (startedAt: Date, completedAt = new Date()) => {
  return completedAt.getTime() - startedAt.getTime();
};

export const getAiLogFields = ({
  nodeType,
  data,
  context,
  output,
}: {
  nodeType: NodeType;
  data: Record<string, unknown>;
  context: Record<string, unknown>;
  output?: Record<string, unknown>;
}) => {
  const aiNodeTypes = new Set<NodeType>([NodeType.OPENAI, NodeType.ANTHROPIC, NodeType.GEMINI]);
  if (!aiNodeTypes.has(nodeType)) {
    return {};
  }

  const provider =
    nodeType === NodeType.OPENAI
      ? 'openai'
      : nodeType === NodeType.ANTHROPIC
        ? 'anthropic'
        : 'gemini';
  const model = typeof data.model === 'string' ? data.model : undefined;
  const systemTemplate =
    typeof data.systemPrompt === 'string' ? data.systemPrompt : 'You are a helpful assistant.';
  const userTemplate = typeof data.userPrompt === 'string' ? data.userPrompt : '';
  const variableName = typeof data.variableName === 'string' ? data.variableName : undefined;
  const responseValue = variableName ? output?.[variableName] : undefined;
  const responseText =
    responseValue &&
    typeof responseValue === 'object' &&
    'aiResponse' in responseValue &&
    typeof responseValue.aiResponse === 'string'
      ? responseValue.aiResponse
      : undefined;

  return {
    provider,
    model,
    systemPrompt: systemTemplate,
    userPrompt: userTemplate,
    resolvedPrompt: Handlebars.compile(userTemplate)(context),
    responseText,
  };
};

export const skippedNodeData = {
  status: ExecutionNodeStatus.SKIPPED,
  startedAt: new Date(),
  completedAt: new Date(),
  durationMs: 0,
};
