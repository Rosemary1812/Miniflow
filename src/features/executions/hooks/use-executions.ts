// Hooks to fetch all workflows using suspense

import { useTRPC } from '@/app/trpc/client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useExecutionsParams } from './use-executions-params';

export const useSuspenseExecutions = () => {
  const trpc = useTRPC();
  const [params] = useExecutionsParams(); //TODO
  return useSuspenseQuery(trpc.executions.getMany.queryOptions(params));
};

//Hooks to create a new execution
export const useSuspenseExecution = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.executions.getOne.queryOptions({ id }));
};
