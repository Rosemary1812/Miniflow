import type { inferInput } from '@trpc/tanstack-react-query';
import { prefetch, trpc } from '@/app/trpc/server';

type Input = inferInput<typeof trpc.aiProviders.getMany>;

export const prefetchCredentials = (params: Input) => {
  return prefetch(trpc.aiProviders.getMany.queryOptions(params));
};

export const prefetchCredential = (id: string) => {
  return prefetch(trpc.aiProviders.getOne.queryOptions({ id }));
};
