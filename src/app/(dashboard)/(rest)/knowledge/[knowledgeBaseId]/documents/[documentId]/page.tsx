import { Suspense } from 'react';
import { LoadingView } from '@/components/entity-components';
import { KnowledgeDocumentPage } from '@/features/knowledge/components/knowledge-document-page';

export default async function KnowledgeDocumentDetailPage({
  params,
}: {
  params: Promise<{ knowledgeBaseId: string; documentId: string }>;
}) {
  const { knowledgeBaseId, documentId } = await params;
  return (
    <Suspense fallback={<LoadingView message="Loading document..." />}>
      <KnowledgeDocumentPage knowledgeBaseId={knowledgeBaseId} documentId={documentId} />
    </Suspense>
  );
}
