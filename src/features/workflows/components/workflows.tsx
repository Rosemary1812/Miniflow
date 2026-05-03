'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView,
} from '@/components/entity-components';
import {
  useCreateWorkflow,
  useRemoveWorkflow,
  useSuspenseWorkflows,
} from '@/features/workflows/hooks/use-workflows';
import { useRouter } from 'next/navigation';
import { useWorkflowsParams } from '../hooks/use-workflows-params';
import { useEntitySearch } from '@/hooks/use-entity-search';
import type { Workflow, WorkflowVersion } from '@prisma/client';
import { WorkflowIcon } from 'lucide-react';
import { WorkflowStatusBadge } from './publish-panel';
import { ExecuteWorkflowButton } from '@/features/components/execute-workflow-button';

type WorkflowListItem = Workflow & {
  draftVersion: WorkflowVersion | null;
  publishedVersion: WorkflowVersion | null;
};

const getWorkflowStatus = (workflow: WorkflowListItem) => {
  if (workflow.draftVersion?.status) {
    return workflow.draftVersion.status;
  }
  if (workflow.publishedVersion) {
    return 'PUBLISHED';
  }
  return 'NO_VERSION';
};

const getPublishedVersionLabel = (workflow: WorkflowListItem) => {
  return workflow.publishedVersion
    ? `Published v${workflow.publishedVersion.version}`
    : 'Not published';
};

export const WorkflowSearch = () => {
  const [params, setParams] = useWorkflowsParams();
  const { searchValue, onSearchChange } = useEntitySearch({ params, setParams });
  return (
    <EntitySearch value={searchValue} onChange={onSearchChange} placeholder="Search workflows" />
  );
};

export const WorkflowsList = () => {
  const workflows = useSuspenseWorkflows();

  return (
    <EntityList
      items={workflows.data.items}
      getKey={workflow => workflow.id}
      renderItem={workflow => <WorkflowItem data={workflow} />}
      emptyView={<WorkflowsEmpty />}
    />
  );
};

export const WorkFlowsHeader = ({ disabled }: { disabled?: boolean }) => {
  const createWorkflow = useCreateWorkflow();
  const router = useRouter();
  const handleCraete = () => {
    createWorkflow.mutate(undefined, {
      onSuccess: data => {
        router.push(`/workflows/${data.id}`);
      },
    });
  };
  return (
    <EntityHeader
      title="Workflows"
      description="Create and manage your workflows"
      newBottonLabel="New Workflow"
      isCreating={createWorkflow.isPending}
      disabled={disabled}
      onNew={handleCraete}
    />
  );
};

export const WorkflowsPagination = () => {
  const workflows = useSuspenseWorkflows();
  const [params, setParams] = useWorkflowsParams();

  return (
    <EntityPagination
      disabled={workflows.isFetching}
      totalPages={workflows.data.totalPages}
      page={workflows.data.page}
      onPageChange={page => setParams({ ...params, page })}
    />
  );
};

export const WorkflowContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <EntityContainer
      header={<WorkFlowsHeader />}
      search={<WorkflowSearch />}
      pagination={<WorkflowsPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const WorkflowsLoading = () => {
  return <LoadingView message="Loading workflows..." />;
};

export const WorkflowsError = () => {
  return <ErrorView message="Error loading workflows..." />;
};
export const WorkflowsEmpty = () => {
  const router = useRouter();
  const createWorkflow = useCreateWorkflow();

  const handleCreate = () => {
    createWorkflow.mutate(undefined, {
      onSuccess: data => {
        router.push(`/workflows/${data.id}`);
      },
    });
  };
  return (
    <EmptyView
      onNew={handleCreate}
      message="No workflows found. Get started by creating a workflow"
    />
  );
};
export const WorkflowItem = ({ data }: { data: WorkflowListItem }) => {
  const removeWorkflow = useRemoveWorkflow();
  const handleRemove = () => {
    removeWorkflow.mutate({ id: data.id });
  };
  const isPublished = Boolean(data.publishedVersion);
  const executeDisabledReason = isPublished
    ? undefined
    : 'Submit the draft for review and publish it before execution.';

  return (
    <EntityItem
      href={`/workflows/${data.id}`}
      title={data.name}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <WorkflowStatusBadge status={getWorkflowStatus(data)} />
          <span>{getPublishedVersionLabel(data)}</span>
          <span>&bull;</span>
          <span>Updated {formatDistanceToNow(data.updatedAt, { addSuffix: true })}</span>
          <span>&bull;</span>
          <span>Created {formatDistanceToNow(data.createdAt, { addSuffix: true })}</span>
        </span>
      }
      image={
        <div className="size-8 flex items-center justify-center">
          <WorkflowIcon className="size-8 text-muted-foreground" />
        </div>
      }
      actions={
        <ExecuteWorkflowButton
          workflowId={data.id}
          disabledReason={executeDisabledReason}
          size="sm"
        />
      }
      onRemove={handleRemove}
      isRemoving={removeWorkflow.isPending}
    ></EntityItem>
  );
};
