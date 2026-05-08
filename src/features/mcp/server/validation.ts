import { TRPCError } from '@trpc/server';

const headerNamePattern = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export const normalizeMcpUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
    if (!parsed.hostname) {
      throw new Error('Missing hostname');
    }
    return parsed.toString();
  } catch {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'MCP server URL must be a valid http or https URL',
    });
  }
};

export const validateAuthHeaderName = (authHeaderName?: string | null): string => {
  const value = authHeaderName?.trim();
  if (!value || !headerNamePattern.test(value)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A valid auth header name is required',
    });
  }
  return value;
};

export const parseArgumentsTemplateResult = (value: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Expected object');
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error('MCP tool arguments must render to a valid JSON object');
  }
};

export const normalizeTimeoutMs = (timeoutMs?: number): number => {
  if (timeoutMs === undefined || Number.isNaN(timeoutMs)) {
    return 30000;
  }
  return Math.min(Math.max(Math.trunc(timeoutMs), 1000), 120000);
};
