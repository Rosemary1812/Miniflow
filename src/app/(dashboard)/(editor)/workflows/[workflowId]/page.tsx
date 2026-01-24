import { HydrateClient, prefetch } from '@/app/trpc/server';
import { WorkflowsError, WorkflowsLoading } from '@/features/workflows/components/workflows';
import { prefetchWorkflow } from '@/features/workflows/server/prefetch';
import { requireAuth } from '@/lib/auth-utils';
import { ErrorBoundary } from 'react-error-boundary';
import { Suspense } from 'react';
import { EditorError, EditorLoading, Editor } from '@/features/editor/components/editor';
import { EditorHeader } from '@/features/editor/components/editor-header';

interface PageProps {
  params: Promise<{
    workflowId: string; // 修正为与文件夹名一致的字段名
  }>;
}

const Page = async ({ params }: PageProps) => {
  await requireAuth();
  const { workflowId } = await params;
  prefetchWorkflow(workflowId);
  return (
    <HydrateClient>
      <ErrorBoundary fallback={<EditorError />}>
        <Suspense fallback={<EditorLoading />}>
          <EditorHeader workflowId={workflowId} />
          <main className="flex-1">
            <Editor workflowId={workflowId} />
          </main>
          <Editor workflowId={workflowId} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default Page;
