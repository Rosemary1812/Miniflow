import { useTRPC } from '@/app/trpc/client';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useMcpServers = (search = '') => {
  const trpc = useTRPC();
  return useQuery(trpc.mcpServers.getMany.queryOptions({ search }));
};

export const useSuspenseMcpServer = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.mcpServers.getOne.queryOptions({ id }));
};

export const useMcpToolsByServer = (mcpServerId?: string) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.mcpTools.getByServer.queryOptions({ mcpServerId: mcpServerId || '' }),
    enabled: Boolean(mcpServerId),
  });
};

export const useCreateMcpServer = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.mcpServers.create.mutationOptions({
      onSuccess: data => {
        toast.success(`MCP server "${data.name}" created`);
        queryClient.invalidateQueries(trpc.mcpServers.getMany.queryOptions({}));
      },
      onError: error => {
        toast.error(`Failed to create MCP server: ${error.message}`);
      },
    }),
  );
};

export const useUpdateMcpServer = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.mcpServers.update.mutationOptions({
      onSuccess: data => {
        toast.success(`MCP server "${data.name}" saved`);
        queryClient.invalidateQueries(trpc.mcpServers.getMany.queryOptions({}));
        queryClient.invalidateQueries(trpc.mcpServers.getOne.queryOptions({ id: data.id }));
      },
      onError: error => {
        toast.error(`Failed to save MCP server: ${error.message}`);
      },
    }),
  );
};

export const useRemoveMcpServer = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.mcpServers.remove.mutationOptions({
      onSuccess: data => {
        toast.success(`MCP server "${data.name}" removed`);
        queryClient.invalidateQueries(trpc.mcpServers.getMany.queryOptions({}));
      },
      onError: error => {
        toast.error(`Failed to remove MCP server: ${error.message}`);
      },
    }),
  );
};

export const useSyncMcpTools = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.mcpServers.syncTools.mutationOptions({
      onSuccess: data => {
        toast.success(`Synced ${data.count} MCP tools`);
        queryClient.invalidateQueries(trpc.mcpServers.getMany.queryOptions({}));
        queryClient.invalidateQueries(trpc.mcpTools.getByServer.queryFilter());
      },
      onError: error => {
        toast.error(`Failed to sync MCP tools: ${error.message}`);
      },
    }),
  );
};
