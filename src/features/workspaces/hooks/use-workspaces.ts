'use client';

import { useTRPC } from '@/app/trpc/client';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export const useWorkspaces = () => {
  const trpc = useTRPC();
  return useQuery(trpc.workspaces.list.queryOptions());
};

export const useCurrentWorkspace = () => {
  const trpc = useTRPC();
  return useQuery(trpc.workspaces.getCurrent.queryOptions());
};

export const useSuspenseWorkspaces = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.workspaces.list.queryOptions());
};

export const useSuspenseCurrentWorkspace = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.workspaces.getCurrent.queryOptions());
};

export const useCreateWorkspace = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation(
    trpc.workspaces.create.mutationOptions({
      onSuccess: data => {
        toast.success(`Workspace "${data.name}" created`);
        queryClient.invalidateQueries();
        router.refresh();
      },
      onError: error => toast.error(`Failed to create workspace: ${error.message}`),
    }),
  );
};

export const useSwitchWorkspace = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation(
    trpc.workspaces.switch.mutationOptions({
      onSuccess: data => {
        toast.success(`Switched to "${data.name}"`);
        queryClient.invalidateQueries();
        router.refresh();
      },
      onError: error => toast.error(`Failed to switch workspace: ${error.message}`),
    }),
  );
};

export const useWorkspaceMembers = (workspaceId?: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.workspaceMembers.list.queryOptions({ workspaceId }));
};

export const useWorkspaceInvites = (workspaceId?: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.workspaceMembers.invites.queryOptions({ workspaceId }));
};

export const useInviteWorkspaceMember = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workspaceMembers.invite.mutationOptions({
      onSuccess: () => {
        toast.success('Invite created');
        queryClient.invalidateQueries();
      },
      onError: error => toast.error(`Failed to create invite: ${error.message}`),
    }),
  );
};

export const useUpdateWorkspaceMemberRole = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workspaceMembers.updateRole.mutationOptions({
      onSuccess: () => {
        toast.success('Member role updated');
        queryClient.invalidateQueries();
      },
      onError: error => toast.error(`Failed to update role: ${error.message}`),
    }),
  );
};

export const useRemoveWorkspaceMember = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.workspaceMembers.remove.mutationOptions({
      onSuccess: () => {
        toast.success('Member removed');
        queryClient.invalidateQueries();
      },
      onError: error => toast.error(`Failed to remove member: ${error.message}`),
    }),
  );
};

export const useAcceptWorkspaceInvite = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation(
    trpc.workspaceMembers.acceptInvite.mutationOptions({
      onSuccess: () => {
        toast.success('Invite accepted');
        queryClient.invalidateQueries();
        router.refresh();
      },
      onError: error => toast.error(`Failed to accept invite: ${error.message}`),
    }),
  );
};
