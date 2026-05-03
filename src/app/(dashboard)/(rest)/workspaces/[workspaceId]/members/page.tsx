import { HydrateClient } from '@/app/trpc/server';
import {
  WorkspaceMembersError,
  WorkspaceMembersLoading,
  WorkspaceMembersPage,
} from '@/features/workspaces/components/workspace-members-page';
import { requireAuth } from '@/lib/auth-utils';
import { ErrorBoundary } from '@sentry/nextjs';
import { Suspense } from 'react';

type Props = {
  params: Promise<{ workspaceId: string }>;
};

const Page = async ({ params }: Props) => {
  await requireAuth();
  const { workspaceId } = await params;

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<WorkspaceMembersError />}>
        <Suspense fallback={<WorkspaceMembersLoading />}>
          <WorkspaceMembersPage workspaceId={workspaceId} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default Page;
