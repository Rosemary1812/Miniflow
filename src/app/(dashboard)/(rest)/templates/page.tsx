import { HydrateClient } from '@/app/trpc/server';
import { TemplatesGrid } from '@/features/templates/components/templates-grid';
import { requireAuth } from '@/lib/auth-utils';
import { ErrorBoundary } from '@sentry/nextjs';
import { Suspense } from 'react';

const Page = async () => {
  await requireAuth();

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-5xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground mt-1">
            Start quickly with pre-built workflow templates.
          </p>
        </div>
        <HydrateClient>
          <ErrorBoundary fallback={<div>Something went wrong loading templates.</div>}>
            <Suspense
              fallback={
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-[180px] rounded-lg border animate-pulse bg-muted" />
                  ))}
                </div>
              }
            >
              <TemplatesGrid />
            </Suspense>
          </ErrorBoundary>
        </HydrateClient>
      </div>
    </div>
  );
};

export default Page;
