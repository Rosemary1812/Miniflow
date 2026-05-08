import { Suspense } from 'react';
import { LoadingView } from '@/components/entity-components';
import { KnowledgeBaseDetailPage } from '@/features/knowledge/components/knowledge-base-detail-page';

export default async function KnowledgeBasePage({
  params,
}: {
  params: Promise<{ knowledgeBaseId: string }>;
}) {
  const { knowledgeBaseId } = await params;
  return (
    <Suspense fallback={<LoadingView message="Loading knowledge base..." />}>
      <KnowledgeBaseDetailPage knowledgeBaseId={knowledgeBaseId} />
    </Suspense>
  );
}
