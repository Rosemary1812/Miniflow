import Handlebars from 'handlebars';
import type { NodeExecutor } from '@/features/executions/types';
import { mcpToolChannel } from '@/inngest/channels/mcp-tool';
import { NonRetriableError } from 'inngest';
import prisma from '@/lib/db';
import { callMcpTool } from '@/features/mcp/server/client';
import { normalizeTimeoutMs, parseArgumentsTemplateResult } from '@/features/mcp/server/validation';

Handlebars.registerHelper('json', context => {
  const jsonString = JSON.stringify(context, null, 2);
  const safeString = new Handlebars.SafeString(jsonString);
  return safeString;
});

type McpToolData = {
  variableName?: string;
  mcpServerId?: string;
  toolName?: string;
  argumentsTemplate?: string;
  timeoutMs?: number;
};

const truncateText = (value: string): string => {
  return value.length > 8000 ? `${value.slice(0, 8000)}...[truncated]` : value;
};

const sanitizeContent = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return truncateText(value);
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitizeContent(item));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  if (record.type === 'image' && typeof record.data === 'string') {
    return {
      ...record,
      data: `[image data omitted: ${record.data.length} chars]`,
    };
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => [key, sanitizeContent(entry)]),
  );
};

export const mcpToolExecutor: NodeExecutor<McpToolData> = async ({
  data,
  nodeId,
  workspaceId,
  context,
  step,
  publish,
}) => {
  await publish(
    mcpToolChannel().status({
      nodeId,
      status: 'loading',
    }),
  );

  if (!data.variableName) {
    await publish(mcpToolChannel().status({ nodeId, status: 'error' }));
    throw new NonRetriableError('MCP Tool variableName is missing');
  }
  if (!data.mcpServerId) {
    await publish(mcpToolChannel().status({ nodeId, status: 'error' }));
    throw new NonRetriableError('MCP Tool server is missing');
  }
  if (!data.toolName) {
    await publish(mcpToolChannel().status({ nodeId, status: 'error' }));
    throw new NonRetriableError('MCP Tool name is missing');
  }
  const variableName = data.variableName;
  const mcpServerId = data.mcpServerId;
  const toolName = data.toolName;

  const renderedArguments = Handlebars.compile(data.argumentsTemplate || '{}')(context);
  let args: Record<string, unknown>;
  try {
    args = parseArgumentsTemplateResult(renderedArguments);
  } catch (error) {
    await publish(mcpToolChannel().status({ nodeId, status: 'error' }));
    throw new NonRetriableError(error instanceof Error ? error.message : 'Invalid MCP arguments');
  }

  try {
    const result = await step.run('mcp-tool-call', async () => {
      const server = await prisma.mcpServer.findFirst({
        where: {
          id: mcpServerId,
          workspaceId,
        },
      });

      if (!server) {
        throw new NonRetriableError('MCP server was not found in this workspace');
      }
      if (!server.enabled) {
        throw new NonRetriableError('MCP server is disabled');
      }

      const tool = await prisma.mcpToolCache.findFirst({
        where: {
          mcpServerId: server.id,
          workspaceId,
          name: toolName,
        },
      });

      if (!tool) {
        throw new NonRetriableError('MCP tool is not synced for this server');
      }

      const toolResult = await callMcpTool({
        server,
        toolName,
        args,
        timeoutMs: normalizeTimeoutMs(data.timeoutMs),
      });

      return {
        ...context,
        [variableName]: {
          mcpTool: {
            serverId: server.id,
            toolName,
            content: sanitizeContent(toolResult.content),
            structuredContent: sanitizeContent(toolResult.structuredContent),
            isError: Boolean(toolResult.isError),
          },
        },
      };
    });

    await publish(mcpToolChannel().status({ nodeId, status: 'success' }));
    return result;
  } catch (error) {
    await publish(mcpToolChannel().status({ nodeId, status: 'error' }));
    throw error;
  }
};
