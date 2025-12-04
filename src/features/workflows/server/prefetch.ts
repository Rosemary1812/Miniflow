import type { inferInput } from '@trpc/tanstack-react-query';
import { prefetch, trpc } from '@/app/trpc/server';

type Input = inferInput<typeof trpc.workflows.getMany>;

// prefetch all workflow

export const prefetchWorkflows = async (params: Input) => {
  return prefetch(trpc.workflows.getMany.queryOptions(params));
};
