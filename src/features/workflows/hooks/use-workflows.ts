// Hooks to fetch all workflows using suspense

import { useTRPC } from '@/app/trpc/client';
import { useSuspenseQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useWorkflowsParams } from './use-workflows-params';

const toWorkflowErrorMessage = (message: string) => {
  if (message.includes('ResourceNotFound') || message.includes('Polar')) {
    return 'Workflow creation is currently unavailable. Please try again or contact support.';
  }
  return message;
};

export const useSuspenseWorkflows = () => {
  const trpc = useTRPC();
  const [params] = useWorkflowsParams(); //TODO
  return useSuspenseQuery(trpc.workflows.getMany.queryOptions(params));
};

// create a new workflow

export const useCreateWorkflow = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.create.mutationOptions({
      onSuccess: data => {
        toast.success(`Workflow "${data.name}" created successfully`);
        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
      },
      onError: error => {
        toast.error(`Failed to create workflow: ${toWorkflowErrorMessage(error.message)}`);
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

export const useSuspenseWorkflow = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.workflows.getOne.queryOptions({ id }));
};

// Hook to update workflow name
export const useUpdateWorkflowName = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.updateName.mutationOptions({
      onSuccess: data => {
        toast.success(`Workflow "${data.name}" updated successfully`);
        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
        queryClient.invalidateQueries(trpc.workflows.getOne.queryOptions({ id: data.id }));
      },
      onError: error => {
        toast.error(`Failed to update workflow: ${error.message}`);
      },
    }),
  );
};

// Hook to update  a workflow
export const useUpdateWorkflow = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.update.mutationOptions({
      onSuccess: data => {
        toast.success(`Workflow "${data.name}" saved`);
        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
        queryClient.invalidateQueries(trpc.workflows.getOne.queryOptions({ id: data.id }));
      },
      onError: error => {
        toast.error(`Failed to save workflow: ${error.message}`);
      },
    }),
  );
};

// Hook to execute  a workflow
export const useExecuteWorkflow = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.workflows.execute.mutationOptions({
      onSuccess: data => {
        toast.success(`Workflow "${data.name}" executed`);
      },
      onError: error => {
        toast.error(`Failed to execute workflow: ${error.message}`);
      },
    }),
  );
};

export const useSubmitWorkflowReview = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.submitReview.mutationOptions({
      onSuccess: data => {
        toast.success('Workflow submitted for review');
        queryClient.invalidateQueries(trpc.workflows.getOne.queryOptions({ id: data.workflowId }));
        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
      },
      onError: error => toast.error(`Failed to submit review: ${error.message}`),
    }),
  );
};

export const useApproveWorkflow = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.approve.mutationOptions({
      onSuccess: data => {
        toast.success('Workflow published');
        queryClient.invalidateQueries(trpc.workflows.getOne.queryOptions({ id: data.workflowId }));
        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
      },
      onError: error => toast.error(`Failed to publish workflow: ${error.message}`),
    }),
  );
};

export const useRejectWorkflow = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workflows.reject.mutationOptions({
      onSuccess: data => {
        toast.success('Workflow review rejected');
        queryClient.invalidateQueries(trpc.workflows.getOne.queryOptions({ id: data.workflowId }));
        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
      },
      onError: error => toast.error(`Failed to reject workflow: ${error.message}`),
    }),
  );
};
