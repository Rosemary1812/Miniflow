import { HydrateClient } from '@/app/trpc/server';
import {
  WorkspacesError,
  WorkspacesLoading,
  WorkspacesPage,
} from '@/features/workspaces/components/workspaces-page';
import { requireAuth } from '@/lib/auth-utils';
import { ErrorBoundary } from '@sentry/nextjs';
import { Suspense } from 'react';

const Page = async () => {
  await requireAuth();

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<WorkspacesError />}>
        <Suspense fallback={<WorkspacesLoading />}>
          <WorkspacesPage />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default Page;
