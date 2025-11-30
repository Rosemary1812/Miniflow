'use client';
import { requireAuth } from '@/lib/auth-utils';
import { caller } from '@/app/trpc/server';
import { LogoutButton } from './logout';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from './trpc/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Page = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data } = useQuery(trpc.getWorkflows.queryOptions());
  const create = useMutation(
    trpc.createWorkflow.mutationOptions({
      onSuccess: () => {
        toast.success('job queue');
      },
    }),
  );

  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center server flex-col gap-y-6">
      protected page
      <div>{JSON.stringify(data, null, 2)}</div>
      <Button onClick={() => create.mutate()} disabled={create.isPending}>
        创建工作流
      </Button>
      <LogoutButton />
    </div>
  );
};

export default Page;
