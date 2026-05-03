import { HydrateClient } from '@/app/trpc/server';
import {
  WorkspaceInvitesError,
  WorkspaceInvitesLoading,
  WorkspaceInvitesPage,
} from '@/features/workspaces/components/workspace-invites-page';
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
      <ErrorBoundary fallback={<WorkspaceInvitesError />}>
        <Suspense fallback={<WorkspaceInvitesLoading />}>
          <WorkspaceInvitesPage workspaceId={workspaceId} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default Page;
