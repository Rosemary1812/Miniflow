// Hooks to fetch all workflows using suspense

import { useTRPC } from '@/app/trpc/client';
import { useSuspenseQuery, useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCredentialsParams } from './use-credentials-params';
import { CredentialType } from '@prisma/client';

export const useSuspenseCredentials = () => {
  const trpc = useTRPC();
  const [params] = useCredentialsParams(); //TODO
  return useSuspenseQuery(trpc.credentials.getMany.queryOptions(params));
};

//Hooks to create a new credential

export const useCreateCredential = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.credentials.create.mutationOptions({
      onSuccess: data => {
        toast.success(`Credential "${data.name}" created successfully`);
        queryClient.invalidateQueries(trpc.credentials.getMany.queryOptions({}));
      },
      onError: error => {
        toast.error(`Failed to create credential: ${error.message}`);
      },
    }),
  );
};
//  hook to remove a credential
export const useRemoveCredential = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.credentials.remove.mutationOptions({
      onSuccess: data => {
        toast.success(`Credential "${data.name}" removed successfully`);
        queryClient.invalidateQueries(trpc.credentials.getMany.queryOptions({}));
        queryClient.invalidateQueries(trpc.credentials.getOne.queryFilter({ id: data.id }));
      },
      // onError: error => {
      //   toast.error(`Failed to remove credential: ${error.message}`);
      // },
    }),
  );
};

export const useSuspenseCredential = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.credentials.getOne.queryOptions({ id }));
};

// Hook to update  a credential
export const useUpdateCredential = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.credentials.update.mutationOptions({
      onSuccess: data => {
        toast.success(`Credential "${data.name}" saved`);
        queryClient.invalidateQueries(trpc.credentials.getMany.queryOptions({}));
        queryClient.invalidateQueries(trpc.credentials.getOne.queryOptions({ id: data.id }));
      },
      onError: error => {
        toast.error(`Failed to save credential: ${error.message}`);
      },
    }),
  );
};

export const useCredentialsByType = (type: CredentialType) => {
  const trpc = useTRPC();
  return useQuery(trpc.credentials.getByType.queryOptions({ type }));
};
