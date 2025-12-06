// Hooks to fetch all workflows using suspense

import { useTRPC } from '@/app/trpc/client';
import { useSuspenseQuery, QueryClient, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useWorkflowsParams } from './use-workflows-params';
import { trpc } from '@/app/trpc/server';

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
//  hook to remove a workflow
export const useRemoveWorkflow = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.remove.mutationOptions({
      onSuccess: data => {
        toast.success(`Workflow "${data.name}" removed successfully`);
        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
        queryClient.invalidateQueries(trpc.workflows.getOne.queryFilter({ id: data.id }));
      },
      // onError: error => {
      //   toast.error(`Failed to remove workflow: ${error.message}`);
      // },
    }),
  );
};
