import { HydrateClient } from '@/app/trpc/server';
import { WorkflowsList, WorkflowContainer } from '@/features/workflows/components/workflows';
import type { SearchParams } from 'nuqs/server';
import { prefetchWorkflows } from '@/features/workflows/server/prefetch';
import { requireAuth } from '@/lib/auth-utils';
import { ErrorBoundary } from '@sentry/nextjs';
import { Suspense } from 'react';
import { workflowsParamsLoader } from '@/features/workflows/server/params-loader';
type Props = {
  searchParams: Promise<SearchParams>;
};
const Page = async ({ searchParams }: Props) => {
  await requireAuth();
  const params = await workflowsParamsLoader(searchParams);
  prefetchWorkflows(params);
  return (
    <WorkflowContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<p>Error!</p>}>
          <Suspense fallback={<p>Loading...</p>}>
            <WorkflowsList />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </WorkflowContainer>
  );
};
export default Page;
