import { Button } from '@/components/ui/button';
import { useExecuteWorkflow } from '@/features/workflows/hooks/use-workflows';
import { FlaskConicalIcon } from 'lucide-react';
import { type MouseEvent } from 'react';
import { toast } from 'sonner';

type ExecuteWorkflowButtonProps = {
  workflowId: string;
  disabledReason?: string;
  size?: 'sm' | 'lg';
};

export const ExecuteWorkflowButton = ({
  workflowId,
  disabledReason,
  size = 'lg',
}: ExecuteWorkflowButtonProps) => {
  const executeWorkflow = useExecuteWorkflow();
  const handleExecute = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabledReason) {
      toast.info(disabledReason);
      return;
    }
    executeWorkflow.mutate({ id: workflowId });
  };
  const isDisabled = executeWorkflow.isPending || Boolean(disabledReason);

  return (
    <span title={disabledReason}>
      <Button size={size} disabled={isDisabled} onClick={handleExecute}>
        <FlaskConicalIcon className="size-4" />
        Execute Workflow
      </Button>
    </span>
  );
};
