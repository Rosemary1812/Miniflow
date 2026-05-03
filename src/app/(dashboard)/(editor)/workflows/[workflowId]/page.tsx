import { HydrateClient } from '@/app/trpc/server';
import { prefetchWorkflow } from '@/features/workflows/server/prefetch';
import { requireAuth } from '@/lib/auth-utils';
import { ErrorBoundary } from 'react-error-boundary';
import { Suspense } from 'react';
import type { ReactElement } from 'react';
import { EditorError, EditorLoading } from '@/features/components/editor';
import { EditorHeader } from '@/features/components/editor-header';
import { WorkflowEditorLayout } from '@/features/components/workflow-editor-layout';

interface PageProps {
  params: Promise<{
    workflowId: string; // 修正为与文件夹名一致的字段名
  }>;
}

const Page = async ({ params }: PageProps): Promise<ReactElement> => {
  await requireAuth();
  const { workflowId } = await params;
  prefetchWorkflow(workflowId);
  return (
    <HydrateClient>
      <ErrorBoundary fallback={<EditorError />}>
        <Suspense fallback={<EditorLoading />}>
          <EditorHeader workflowId={workflowId} />
          <WorkflowEditorLayout workflowId={workflowId} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default Page;
