'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMcpToolsByServer } from '../hooks/use-mcp-servers';

export const McpToolsTable = ({ mcpServerId }: { mcpServerId?: string }) => {
  const tools = useMcpToolsByServer(mcpServerId);
  const items = tools.data || [];

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Tools</CardTitle>
        <CardDescription>Synced tools exposed by this MCP server</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">No tools synced for this server.</p>
        )}
        {items.map(tool => (
          <div key={tool.id} className="rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{tool.name}</Badge>
              <span className="text-xs text-muted-foreground">
                Synced {tool.lastSyncedAt.toLocaleString()}
              </span>
            </div>
            {tool.description && (
              <p className="mt-2 text-sm text-muted-foreground">{tool.description}</p>
            )}
            {tool.inputSchema && (
              <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(tool.inputSchema, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
