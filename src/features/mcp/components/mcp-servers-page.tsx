'use client';

import { formatDistanceToNow } from 'date-fns';
import { AlertCircleIcon, PlugIcon, RefreshCwIcon } from 'lucide-react';
import { useState } from 'react';
import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntitySearch,
  ErrorView,
  LoadingView,
} from '@/components/entity-components';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEntitySearch } from '@/hooks/use-entity-search';
import { useMcpServers, useRemoveMcpServer, useSyncMcpTools } from '../hooks/use-mcp-servers';

type McpParams = {
  search: string;
  page: number;
};

export const McpServersPage = () => {
  const [params, setParams] = useState<McpParams>({ search: '', page: 1 });
  const servers = useMcpServers(params.search);
  const { searchValue, onSearchChange } = useEntitySearch({ params, setParams });

  if (servers.isLoading) {
    return <LoadingView message="Loading MCP servers..." />;
  }

  if (servers.isError) {
    return <ErrorView message="Error loading MCP servers..." />;
  }

  return (
    <EntityContainer
      header={
        <EntityHeader
          title="MCP Servers"
          description="Connect remote MCP servers and sync their tools"
          newBottonLabel="New MCP Server"
          newBottonHref="/mcp/new"
        />
      }
      search={
        <EntitySearch
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search MCP servers"
        />
      }
    >
      <EntityList
        items={servers.data?.items || []}
        getKey={server => server.id}
        emptyView={<EmptyView message="No MCP servers found." />}
        renderItem={server => <McpServerItem server={server} />}
      />
    </EntityContainer>
  );
};

type McpServerItemData = NonNullable<ReturnType<typeof useMcpServers>['data']>['items'][number];

const McpServerItem = ({ server }: { server: McpServerItemData }) => {
  const removeMcpServer = useRemoveMcpServer();
  const syncTools = useSyncMcpTools();

  return (
    <EntityItem
      href={`/mcp/${server.id}`}
      title={server.name}
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span>{server.url}</span>
          <span>&bull;</span>
          <span>{server.toolCount} tools</span>
          <span>&bull;</span>
          <span>Updated {formatDistanceToNow(server.updatedAt, { addSuffix: true })}</span>
          {server.lastError && (
            <>
              <span>&bull;</span>
              <span className="inline-flex items-center gap-1 text-destructive">
                <AlertCircleIcon className="size-3" />
                Sync error
              </span>
            </>
          )}
        </div>
      }
      image={
        <div className="flex size-8 items-center justify-center rounded-md bg-muted">
          <PlugIcon className="size-4" />
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Badge variant={server.enabled ? 'default' : 'secondary'}>
            {server.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
          <Badge variant="outline">{server.authType}</Badge>
          <Button
            size="sm"
            variant="outline"
            disabled={syncTools.isPending}
            onClick={event => {
              event.preventDefault();
              event.stopPropagation();
              syncTools.mutate({ id: server.id });
            }}
          >
            <RefreshCwIcon className="size-4" />
            Sync
          </Button>
        </div>
      }
      onRemove={() => removeMcpServer.mutate({ id: server.id })}
      isRemoving={removeMcpServer.isPending}
    />
  );
};
