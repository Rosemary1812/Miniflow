// Hooks to fetch all workflows using suspense

import { useTRPC } from '@/app/trpc/client';
import { useSuspenseQuery, QueryClient, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useWorkflowsParams } from './use-workflows-params';

export const useSuspenseWorkflows = () => {
  const trpc = useTRPC();
  const [params] = useWorkflowsParams(); //TODO
  return useSuspenseQuery(trpc.workflows.getMany.queryOptions(params));
};

// create a new workflow

export const useCreateWorkflow = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation(
    trpc.workflows.create.mutationOptions({
      onSuccess: data => {
        toast.success(`Workflow "${data.name}" created successfully`);
        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
      },
      onError: error => {
        toast.error(`Failed to create workflow: ${error.message}`);
      },
    }),
  );
};
