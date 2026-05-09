'use client';

import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  EmptyView,
  EntityContainer,
  EntityItem,
  EntityList,
  ErrorView,
  LoadingView,
} from '@/components/entity-components';
import {
  useCreateKnowledgeDocument,
  useKnowledgeDocuments,
  useRemoveKnowledgeDocument,
  useSuspenseKnowledgeBase,
  useTestKnowledgeRetrieval,
} from '../hooks/use-knowledge';

type ImportSourceType = 'TEXT' | 'MARKDOWN' | 'PDF';

const fileToBase64 = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

export const KnowledgeBaseDetailPage = ({ knowledgeBaseId }: { knowledgeBaseId: string }) => {
  const base = useSuspenseKnowledgeBase(knowledgeBaseId);
  const documents = useKnowledgeDocuments(knowledgeBaseId);
  const [open, setOpen] = useState(false);
  const [sourceType, setSourceType] = useState<ImportSourceType>('TEXT');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const createDocument = useCreateKnowledgeDocument(knowledgeBaseId);

  if (documents.isLoading) {
    return <LoadingView message="Loading documents..." />;
  }
  if (documents.isError) {
    return <ErrorView message="Error loading documents..." />;
  }

  const resetImportForm = () => {
    setOpen(false);
    setSourceType('TEXT');
    setTitle('');
    setText('');
    setFile(null);
  };

  const handleCreateDocument = async () => {
    const sourceData = file ? await fileToBase64(file) : undefined;
    createDocument.mutate(
      {
        knowledgeBaseId,
        title,
        sourceType,
        text: sourceType === 'PDF' ? undefined : text,
        sourceData,
        originalName: file?.name,
        mimeType: file?.type,
      },
      {
        onSuccess: resetImportForm,
      },
    );
  };

  const hasImportContent = sourceType === 'PDF' ? Boolean(file) : Boolean(text.trim());

  return (
    <EntityContainer
      header={
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">
              <Link href="/knowledge">Knowledge</Link>
            </div>
            <h1 className="text-xl font-semibold">{base.data.name}</h1>
            <p className="text-sm text-muted-foreground">
              {base.data.description || 'No description'}
            </p>
            <div className="flex gap-2">
              <Badge variant="outline">{base.data.documentCount} docs</Badge>
              <Badge variant="secondary">{base.data.chunkCount} chunks</Badge>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Import Document</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Source type</Label>
                  <Select
                    value={sourceType}
                    onValueChange={value => {
                      setSourceType(value as ImportSourceType);
                      setText('');
                      setFile(null);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">Text</SelectItem>
                      <SelectItem value="MARKDOWN">Markdown</SelectItem>
                      <SelectItem value="PDF">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={event => {
                      setTitle(event.target.value);
                    }}
                  />
                </div>
                {sourceType === 'PDF' ? (
                  <div className="space-y-2">
                    <Label>PDF file</Label>
                    <Input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={event => {
                        setFile(event.target.files?.[0] || null);
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>{sourceType === 'MARKDOWN' ? 'Markdown' : 'Text'}</Label>
                    <Textarea
                      value={text}
                      onChange={event => {
                        setText(event.target.value);
                      }}
                      className="min-h-[260px] font-mono text-sm"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  disabled={!title || !hasImportContent || createDocument.isPending}
                  onClick={() => void handleCreateDocument()}
                >
                  Import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <RetrievalTestPanel knowledgeBaseId={knowledgeBaseId} />
      <EntityList
        items={documents.data || []}
        getKey={document => document.id}
        emptyView={<EmptyView message="No documents imported." />}
        renderItem={document => (
          <KnowledgeDocumentItem knowledgeBaseId={knowledgeBaseId} document={document} />
        )}
      />
    </EntityContainer>
  );
};

type KnowledgeDocumentItemData = NonNullable<
  ReturnType<typeof useKnowledgeDocuments>['data']
>[number];

const KnowledgeDocumentItem = ({
  knowledgeBaseId,
  document,
}: {
  knowledgeBaseId: string;
  document: KnowledgeDocumentItemData;
}) => {
  const removeDocument = useRemoveKnowledgeDocument(knowledgeBaseId);

  return (
    <EntityItem
      href={`/knowledge/${knowledgeBaseId}/documents/${document.id}`}
      title={document.title}
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span>{document.chunkCount} chunks</span>
          <span>&bull;</span>
          <span>{document.sourceType}</span>
          {document.originalName ? (
            <>
              <span>&bull;</span>
              <span>{document.originalName}</span>
            </>
          ) : null}
          <span>&bull;</span>
          <span>Updated {formatDistanceToNow(document.updatedAt, { addSuffix: true })}</span>
          {document.error ? (
            <>
              <span>&bull;</span>
              <span className="text-destructive">{document.error}</span>
            </>
          ) : null}
        </div>
      }
      actions={
        <Badge variant={document.status === 'READY' ? 'default' : 'secondary'}>
          {document.status}
        </Badge>
      }
      onRemove={() => {
        removeDocument.mutate({ id: document.id });
      }}
      isRemoving={removeDocument.isPending}
    />
  );
};

const RetrievalTestPanel = ({ knowledgeBaseId }: { knowledgeBaseId: string }) => {
  const [query, setQuery] = useState('');
  const retrieval = useTestKnowledgeRetrieval();

  return (
    <div className="rounded-md border p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input
          value={query}
          onChange={event => {
            setQuery(event.target.value);
          }}
          placeholder="Test retrieval query"
        />
        <Button
          variant="outline"
          disabled={!query || retrieval.isPending}
          onClick={() => {
            retrieval.mutate({
              knowledgeBaseIds: [knowledgeBaseId],
              query,
              topK: 5,
              scoreThreshold: 0.25,
            });
          }}
        >
          Test Retrieval
        </Button>
      </div>
      {retrieval.data ? (
        <div className="mt-4 space-y-3">
          {retrieval.data.result.map(result => (
            <div key={result.chunkId} className="rounded-md bg-muted p-3 text-sm">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium">{result.title}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">score {result.score.toFixed(3)}</Badge>
                  <Badge variant="secondary">vector {result.vectorScore.toFixed(3)}</Badge>
                  <Badge variant="secondary">keyword {result.keywordScore.toFixed(3)}</Badge>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-muted-foreground">{result.content}</p>
            </div>
          ))}
          {retrieval.data.result.length === 0 ? (
            <p className="text-sm text-muted-foreground">No chunks matched the threshold.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
