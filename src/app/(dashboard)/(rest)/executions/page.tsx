import { requireAuth } from '@/lib/auth-utils';
import { SearchParams } from 'nuqs';
import { HydrateClient } from '../../../trpc/server';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { Suspense } from 'react';
import {
  ExecutionsContainer,
  ExecutionsError,
  ExecutionsList,
  ExecutionsLoading,
} from '@/features/executions/components/executions';
import { executionsParamsLoader } from '@/features/executions/server/params-loader';
import { prefetchExecutions } from '@/features/executions/server/prefetch';
import { EntityContainer } from '@/components/entity-components';
// import { ExecutionsError, ExecutionsLoading } from '@/features/executions/components/executions';
type Props = {
  searchParams: Promise<SearchParams>;
};
const Page = async ({ searchParams }: Props) => {
  await requireAuth();

  const params = await executionsParamsLoader(searchParams);
  await prefetchExecutions(params);
  return (
    <EntityContainer>
      <ExecutionsContainer>
        <HydrateClient>
          <ErrorBoundary fallback={<ExecutionsError />}>
            <Suspense fallback={<ExecutionsLoading />}>
              <ExecutionsList />
            </Suspense>
          </ErrorBoundary>
        </HydrateClient>
      </ExecutionsContainer>
    </EntityContainer>
  );
};
export default Page;
