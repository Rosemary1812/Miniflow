'use client';

import { formatDistanceToNow } from 'date-fns';
import { DatabaseIcon } from 'lucide-react';
import { useState } from 'react';
import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntitySearch,
  ErrorView,
  LoadingView,
} from '@/components/entity-components';
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
import { Textarea } from '@/components/ui/textarea';
import { useEntitySearch } from '@/hooks/use-entity-search';
import {
  useCreateKnowledgeBase,
  useKnowledgeBases,
  useRemoveKnowledgeBase,
} from '../hooks/use-knowledge';

export const KnowledgeBasesPage = () => {
  const [params, setParams] = useState({ search: '', page: 1 });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const bases = useKnowledgeBases(params.search);
  const createBase = useCreateKnowledgeBase();
  const { searchValue, onSearchChange } = useEntitySearch({ params, setParams });

  if (bases.isLoading) {
    return <LoadingView message="Loading knowledge bases..." />;
  }
  if (bases.isError) {
    return <ErrorView message="Error loading knowledge bases..." />;
  }

  const handleCreate = () => {
    createBase.mutate(
      { name, description },
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
          setDescription('');
        },
      },
    );
  };

  return (
    <EntityContainer
      header={
        <div className="flex items-center justify-between gap-3">
          <EntityHeader
            title="Knowledge"
            description="Create text knowledge bases for workflow retrieval"
            newBottonLabel="New Knowledge Base"
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New Knowledge Base</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Knowledge Base</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={event => {
                      setName(event.target.value);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={event => {
                      setDescription(event.target.value);
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button disabled={!name || createBase.isPending} onClick={handleCreate}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
      search={
        <EntitySearch
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search knowledge"
        />
      }
    >
      <EntityList
        items={bases.data?.items || []}
        getKey={item => item.id}
        emptyView={<EmptyView message="No knowledge bases found." />}
        renderItem={item => <KnowledgeBaseItem item={item} />}
      />
    </EntityContainer>
  );
};

type KnowledgeBaseItemData = NonNullable<
  ReturnType<typeof useKnowledgeBases>['data']
>['items'][number];

const KnowledgeBaseItem = ({ item }: { item: KnowledgeBaseItemData }) => {
  const removeBase = useRemoveKnowledgeBase();

  return (
    <EntityItem
      href={`/knowledge/${item.id}`}
      title={item.name}
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span>{item.description || 'No description'}</span>
          <span>&bull;</span>
          <span>Updated {formatDistanceToNow(item.updatedAt, { addSuffix: true })}</span>
        </div>
      }
      image={
        <div className="flex size-8 items-center justify-center rounded-md bg-muted">
          <DatabaseIcon className="size-4" />
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="outline">{item.documentCount} docs</Badge>
          <Badge variant="secondary">{item.chunkCount} chunks</Badge>
        </div>
      }
      onRemove={() => {
        removeBase.mutate({ id: item.id });
      }}
      isRemoving={removeBase.isPending}
    />
  );
};
