'use client';

import { EntityContainer, EntityHeader } from '@/components/entity-components';
import { UpgradeModal } from '@/components/upgrade-model';
import { useCreateWorkflow, useSuspenseWorkflows } from '@/features/workflows/hooks/use-workflows';
import { useUpgradeModal } from '@/hooks/use-upgarde-modal';
import { useRouter } from 'next/navigation';

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
      <EntityHeader
        title="Workflows"
        description="Create and manage your workflows"
        newBottonLabel="New Workflow"
        isCreating={createWorkflow.isPending}
        disabled={disabled}
        onNew={handleCraete}
      />
      {modal}
    </>
  );
};

export const WorkflowContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <EntityContainer header={<WorkFlowsHeader />} search={<></>} pagination={<></>}>
      {children}
    </EntityContainer>
  );
};
