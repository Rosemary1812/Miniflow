'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EntityContainer, ErrorView, LoadingView } from '@/components/entity-components';
import {
  useKnowledgeChunks,
  useReprocessKnowledgeDocument,
  useSuspenseKnowledgeDocument,
} from '../hooks/use-knowledge';

export const KnowledgeDocumentPage = ({
  knowledgeBaseId,
  documentId,
}: {
  knowledgeBaseId: string;
  documentId: string;
}) => {
  const document = useSuspenseKnowledgeDocument(documentId);
  const chunks = useKnowledgeChunks(documentId);
  const reprocess = useReprocessKnowledgeDocument(knowledgeBaseId, documentId);

  if (chunks.isLoading) {
    return <LoadingView message="Loading chunks..." />;
  }
  if (chunks.isError) {
    return <ErrorView message="Error loading chunks..." />;
  }

  return (
    <EntityContainer
      header={
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">
              <Link href={`/knowledge/${knowledgeBaseId}`}>Knowledge base</Link>
            </div>
            <h1 className="text-xl font-semibold">{document.data.title}</h1>
            <div className="flex gap-2">
              <Badge variant={document.data.status === 'READY' ? 'default' : 'secondary'}>
                {document.data.status}
              </Badge>
              <Badge variant="outline">{document.data.chunkCount} chunks</Badge>
            </div>
            {document.data.error ? (
              <p className="text-sm text-destructive">{document.data.error}</p>
            ) : null}
          </div>
          <Button
            variant="outline"
            disabled={reprocess.isPending}
            onClick={() => {
              reprocess.mutate({ id: documentId });
            }}
          >
            Reprocess
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        {chunks.data?.map(chunk => (
          <div key={chunk.id} className="rounded-md border p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Chunk {chunk.index + 1}</Badge>
                {typeof chunk.metadata === 'object' &&
                chunk.metadata &&
                'page' in chunk.metadata &&
                typeof chunk.metadata.page === 'number' ? (
                  <Badge variant="secondary">Page {chunk.metadata.page}</Badge>
                ) : null}
              </div>
              <span className="text-xs text-muted-foreground">{chunk.tokenCount} tokens</span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{chunk.content}</p>
          </div>
        ))}
        {!chunks.data?.length ? (
          <p className="rounded-md border p-4 text-sm text-muted-foreground">
            No chunks available yet.
          </p>
        ) : null}
      </div>
    </EntityContainer>
  );
};
