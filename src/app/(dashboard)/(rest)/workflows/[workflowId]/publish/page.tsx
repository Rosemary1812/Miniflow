import { HydrateClient, prefetch, trpc } from '@/app/trpc/server';
import { PublishPanel } from '@/features/workflows/components/publish-panel';
import { requireAuth } from '@/lib/auth-utils';
import { Suspense } from 'react';

type Props = {
  params: Promise<{ workflowId: string }>;
};

const Page = async ({ params }: Props) => {
  await requireAuth();
  const { workflowId } = await params;
  prefetch(trpc.workflows.getOne.queryOptions({ id: workflowId }));

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <HydrateClient>
        <Suspense fallback={<div>Loading publish panel...</div>}>
          <PublishPanel workflowId={workflowId} />
        </Suspense>
      </HydrateClient>
    </div>
  );
};

export default Page;
