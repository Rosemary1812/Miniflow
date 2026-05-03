import { NonRetriableError } from 'inngest';
import { NodeType, RetryStrategy } from '@prisma/client';

const retryableNodeTypes = new Set<NodeType>([
  NodeType.HTTP_REQUEST,
  NodeType.OPENAI,
  NodeType.ANTHROPIC,
  NodeType.GEMINI,
  NodeType.DISCORD,
  NodeType.SLACK,
  NodeType.GOOGLE_FORM_TRIGGER,
  NodeType.STRIPE_TRIGGER,
]);

export type RetryConfig = {
  enabled: boolean;
  maxAttempts: number;
  strategy: RetryStrategy;
  baseDelayMs: number;
  maxDelayMs: number;
};

export const getRetryConfig = (nodeType: NodeType, data: Record<string, unknown>): RetryConfig => {
  const retry = (data.retry && typeof data.retry === 'object' ? data.retry : data) as Record<
    string,
    unknown
  >;

  const enabled = Boolean(retry.retryEnabled ?? retry.enabled ?? false);

  return {
    enabled: enabled && retryableNodeTypes.has(nodeType),
    maxAttempts: Math.max(Number(retry.retryMaxAttempts ?? retry.maxAttempts ?? 1), 1),
    strategy:
      retry.retryStrategy === RetryStrategy.exponential ||
      retry.strategy === RetryStrategy.exponential
        ? RetryStrategy.exponential
        : RetryStrategy.fixed,
    baseDelayMs: Math.max(Number(retry.retryBaseDelayMs ?? retry.baseDelayMs ?? 1000), 0),
    maxDelayMs: Math.max(Number(retry.retryMaxDelayMs ?? retry.maxDelayMs ?? 30000), 0),
  };
};

export const isRetryableError = (error: unknown) => {
  if (error instanceof NonRetriableError) {
    return false;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /(timeout|timed out|econnreset|econnrefused|network|temporar|unavailable|5\d\d|rate limit|overloaded)/i.test(
    message,
  );
};

export const getRetryDelayMs = (attempt: number, config: RetryConfig) => {
  const delay =
    config.strategy === RetryStrategy.exponential
      ? config.baseDelayMs * 2 ** Math.max(attempt - 1, 0)
      : config.baseDelayMs;

  return Math.min(delay, config.maxDelayMs);
};

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getIdempotencyKey = ({
  executionId,
  nodeId,
  attempt,
}: {
  executionId: string;
  nodeId: string;
  attempt: number;
}) => {
  return `${executionId}:${nodeId}:${attempt}`;
};
