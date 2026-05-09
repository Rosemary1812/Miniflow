import { useTRPC } from '@/app/trpc/client';
import { useSuspenseQuery, useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCredentialsParams } from './use-credentials-params';

export const useSuspenseAiProviders = () => {
  const trpc = useTRPC();
  const [params] = useCredentialsParams();
  return useSuspenseQuery(trpc.aiProviders.getMany.queryOptions(params));
};

export const useCreateAiProvider = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.aiProviders.create.mutationOptions({
      onSuccess: data => {
        toast.success(`Provider "${data.name}" created successfully`);
        queryClient.invalidateQueries(trpc.aiProviders.getMany.queryOptions({}));
        queryClient.invalidateQueries(trpc.aiProviders.getEnabled.queryOptions());
      },
      onError: error => {
        toast.error(`Failed to create provider: ${error.message}`);
      },
    }),
  );
};

export const useRemoveAiProvider = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.aiProviders.remove.mutationOptions({
      onSuccess: data => {
        toast.success(`Provider "${data.name}" removed successfully`);
        queryClient.invalidateQueries(trpc.aiProviders.getMany.queryOptions({}));
        queryClient.invalidateQueries(trpc.aiProviders.getOne.queryFilter({ id: data.id }));
        queryClient.invalidateQueries(trpc.aiProviders.getEnabled.queryOptions());
      },
    }),
  );
};

export const useSuspenseAiProvider = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.aiProviders.getOne.queryOptions({ id }));
};

export const useUpdateAiProvider = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.aiProviders.update.mutationOptions({
      onSuccess: data => {
        toast.success(`Provider "${data.name}" saved`);
        queryClient.invalidateQueries(trpc.aiProviders.getMany.queryOptions({}));
        queryClient.invalidateQueries(trpc.aiProviders.getOne.queryOptions({ id: data.id }));
        queryClient.invalidateQueries(trpc.aiProviders.getEnabled.queryOptions());
      },
      onError: error => {
        toast.error(`Failed to save provider: ${error.message}`);
      },
    }),
  );
};

export const useEnabledAiProviders = () => {
  const trpc = useTRPC();
  return useQuery(trpc.aiProviders.getEnabled.queryOptions());
};
