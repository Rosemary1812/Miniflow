import { HydrateClient } from '@/app/trpc/server';
import { WorkflowsList, WorkflowContainer } from '@/features/workflows/components/workflows';

import { prefetchWorkflows } from '@/features/workflows/server/prefetch';
import { requireAuth } from '@/lib/auth-utils';
import { ErrorBoundary } from '@sentry/nextjs';
import { Suspense } from 'react';
const Page = async () => {
  await requireAuth();
  prefetchWorkflows();
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
