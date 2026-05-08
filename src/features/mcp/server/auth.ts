import type { McpAuthType, McpServer } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { decrypt } from '@/lib/crypto';

type McpAuthConfig = Pick<McpServer, 'authType' | 'encryptedSecret' | 'iv' | 'authHeaderName'>;

export const getMcpAuthHeaders = (server: McpAuthConfig): Record<string, string> => {
  if (server.authType === 'NONE') {
    return {};
  }

  if (!server.encryptedSecret || !server.iv) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'MCP server auth secret is missing',
    });
  }

  const secret = decrypt(server.encryptedSecret, server.iv);

  const handlers: Record<Exclude<McpAuthType, 'NONE'>, () => Record<string, string>> = {
    BEARER: () => ({ Authorization: `Bearer ${secret}` }),
    HEADER: () => {
      if (!server.authHeaderName) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'MCP server auth header name is missing',
        });
      }
      return { [server.authHeaderName]: secret };
    },
  };

  return handlers[server.authType]();
};
