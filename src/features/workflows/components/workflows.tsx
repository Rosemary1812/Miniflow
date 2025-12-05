'use client';

import {
  EntityContainer,
  EntityHeader,
  EntityPagination,
  EntitySearch,
} from '@/components/entity-components';
import { UpgradeModal } from '@/components/upgrade-model';
import { useCreateWorkflow, useSuspenseWorkflows } from '@/features/workflows/hooks/use-workflows';
import { useUpgradeModal } from '@/hooks/use-upgarde-modal';
import { useRouter } from 'next/navigation';
import { useWorkflowsParams } from '../hooks/use-workflows-params';
import { useEntitySearch } from '@/hooks/use-entity-search';

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
    <div className="flex-1 justify-center items-center flex ">
      <p>{JSON.stringify(workflows.data, null, 2)}</p>
    </div>
  );
};
export const WorkFlowsHeader = ({ disabled }: { disabled?: boolean }) => {
  const createWorkflow = useCreateWorkflow();
  const router = useRouter();
  const { handleError, modal } = useUpgradeModal();
  const handleCraete = () => {
    createWorkflow.mutate(undefined, {
      onSuccess: data => {
        router.push(`/workflows/${data.id}`);
      },
      onError: error => {
        handleError(error);
      },
    });
  };
  return (
    <>
      {modal}
      <EntityHeader
        title="Workflows"
        description="Create and manage your workflows"
        newBottonLabel="New Workflow"
        isCreating={createWorkflow.isPending}
        disabled={disabled}
        onNew={handleCraete}
      />
    </>
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
