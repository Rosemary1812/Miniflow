import { requireAuth } from '@/lib/auth-utils';
import { HydrateClient } from '@/app/trpc/server';
import { ErrorBoundary } from '@sentry/nextjs';
import { Suspense } from 'react';
import { AnalyticsDashboard } from '@/features/executions/components/analytics/analytics-dashboard';
import { EntityContainer } from '@/components/entity-components';

const Page = async () => {
  await requireAuth();

  return (
    <EntityContainer>
      <div className="p-6 max-w-6xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your workflow execution performance.
          </p>
        </div>
        <HydrateClient>
          <ErrorBoundary fallback={<div>Something went wrong loading analytics.</div>}>
            <Suspense
              fallback={
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-[100px] rounded-lg border animate-pulse bg-muted" />
                    ))}
                  </div>
                  <div className="h-[300px] rounded-lg border animate-pulse bg-muted" />
                </div>
              }
            >
              <AnalyticsDashboard />
            </Suspense>
          </ErrorBoundary>
        </HydrateClient>
      </div>
    </EntityContainer>
  );
};

export default Page;
