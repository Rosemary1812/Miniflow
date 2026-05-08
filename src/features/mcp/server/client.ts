import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@prisma/client';
import { getMcpAuthHeaders } from './auth';
import { normalizeTimeoutMs } from './validation';

type McpToolServer = Pick<
  McpServer,
  'url' | 'authType' | 'encryptedSecret' | 'iv' | 'authHeaderName'
>;

export type McpToolMetadata = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
};

export type McpToolCallResult = {
  content?: unknown;
  structuredContent?: unknown;
  isError?: boolean;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`MCP request timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

const createMcpClient = async (server: McpToolServer): Promise<Client> => {
  const client = new Client({
    name: 'miniflow',
    version: '0.1.0',
  });
  const transport = new StreamableHTTPClientTransport(new URL(server.url), {
    requestInit: {
      headers: getMcpAuthHeaders(server),
    },
  });
  await client.connect(transport);
  return client;
};

export const listMcpTools = async (server: McpToolServer): Promise<McpToolMetadata[]> => {
  const client = await createMcpClient(server);
  try {
    const result = await client.listTools();
    return result.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  } finally {
    await client.close();
  }
};

export const callMcpTool = async ({
  server,
  toolName,
  args,
  timeoutMs,
}: {
  server: McpToolServer;
  toolName: string;
  args: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<McpToolCallResult> => {
  const client = await createMcpClient(server);
  try {
    const result = await withTimeout(
      client.callTool({ name: toolName, arguments: args }, CallToolResultSchema),
      normalizeTimeoutMs(timeoutMs),
    );

    if ('toolResult' in result) {
      return {
        content: result.toolResult,
      };
    }

    return {
      content: result.content,
      structuredContent: result.structuredContent,
      isError: result.isError,
    };
  } finally {
    await client.close();
  }
};
