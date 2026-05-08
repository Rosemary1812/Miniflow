'use client';

import { RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { McpServerForm } from './mcp-server-form';
import { McpToolsTable } from './mcp-tools-table';
import { useSuspenseMcpServer, useSyncMcpTools } from '../hooks/use-mcp-servers';

export const McpServerView = ({ mcpServerId }: { mcpServerId: string }) => {
  const { data: server } = useSuspenseMcpServer(mcpServerId);
  const syncTools = useSyncMcpTools();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          disabled={syncTools.isPending}
          onClick={() => syncTools.mutate({ id: mcpServerId })}
        >
          <RefreshCwIcon className="size-4" />
          Sync tools
        </Button>
      </div>
      <McpServerForm initialData={server} />
      <McpToolsTable mcpServerId={mcpServerId} />
    </div>
  );
};
