'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntityPagination,
  ErrorView,
  LoadingView,
} from '@/components/entity-components';
import { Badge } from '@/components/ui/badge';
import { useSuspenseExecutions } from '@/features/executions/hooks/use-executions';
import { useExecutionsParams } from '../hooks/use-executions-params';
import { ExecutionNodeStatus, ExecutionStatus, type Execution } from '@prisma/client';
import { CheckCircle2Icon, ClockIcon, Loader2Icon, XCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ExecutionListItem = Execution & {
  workflow: {
    id: string;
    name: string;
  } | null;
  workflowVersion: {
    id: string;
    version: number;
    status: string;
  };
  nodes: Array<{
    id: string;
    status: ExecutionNodeStatus;
    error: string | null;
  }>;
};

export const ExecutionsList = () => {
  const executions = useSuspenseExecutions();

  return (
    <EntityList
      items={executions.data.items}
      getKey={execution => execution.id}
      renderItem={execution => <ExecutionItem data={execution} />}
      emptyView={<ExecutionsEmpty />}
    />
  );
};

export const ExecutionsHeader = ({ disabled }: { disabled?: boolean }) => {
  return (
    <EntityHeader
      title="Executions"
      description="View your workflow execution history"
      newBottonLabel=""
      disabled={disabled}
    />
  );
};

export const ExecutionsPagination = () => {
  const executions = useSuspenseExecutions();
  const [params, setParams] = useExecutionsParams();

  return (
    <EntityPagination
      disabled={executions.isFetching}
      totalPages={executions.data.totalPages}
      page={executions.data.page}
      onPageChange={page => setParams({ ...params, page })}
    />
  );
};

export const ExecutionsContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <EntityContainer header={<ExecutionsHeader />} pagination={<ExecutionsPagination />}>
      {children}
    </EntityContainer>
  );
};

export const ExecutionsLoading = () => {
  return <LoadingView message="Loading executions..." />;
};

export const ExecutionsError = () => {
  return <ErrorView message="Error loading executions..." />;
};
export const ExecutionsEmpty = () => {
  return <EmptyView message="No executions found. Get started by creating an execution" />;
};

export const getExecutionStatusIcon = (status: ExecutionStatus) => {
  switch (status) {
    case ExecutionStatus.SUCCESS:
      return <CheckCircle2Icon className="size-5 text-green-600" />;
    case ExecutionStatus.FAILED:
      return <XCircleIcon className="size-5 text-red-600" />;
    case ExecutionStatus.RUNNING:
      return <Loader2Icon className="size-5 text-blue-600 animate-spin" />;
    default:
      return <ClockIcon className="size-5 text-muted-foreground" />;
  }
};

export const formatStatus = (status: string) => {
  return status.charAt(0) + status.slice(1).toLowerCase();
};

export const ExecutionStatusBadge = ({
  status,
}: {
  status: ExecutionStatus | ExecutionNodeStatus;
}) => {
  const statusValue = String(status);
  const className =
    statusValue === ExecutionStatus.SUCCESS || statusValue === ExecutionNodeStatus.SUCCESS
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : statusValue === ExecutionStatus.FAILED || statusValue === ExecutionNodeStatus.FAILED
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : statusValue === ExecutionStatus.RUNNING || statusValue === ExecutionNodeStatus.RUNNING
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : statusValue === ExecutionNodeStatus.SKIPPED
            ? 'border-slate-200 bg-slate-50 text-slate-700'
            : 'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <Badge variant="outline" className={cn('h-6 rounded-full', className)}>
      {status}
    </Badge>
  );
};

export const formatDuration = (startedAt: Date, completedAt?: Date | null) => {
  if (!completedAt) {
    return 'Running';
  }
  const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  return `${Math.round(durationMs / 1000)}s`;
};

export const ExecutionItem = ({ data }: { data: ExecutionListItem }) => {
  const duration = data.completedAt ? formatDuration(data.startedAt, data.completedAt) : null;
  const failedNodes = data.nodes.filter(node => node.status === ExecutionNodeStatus.FAILED);
  const skippedNodes = data.nodes.filter(node => node.status === ExecutionNodeStatus.SKIPPED);

  const subtitle = (
    <span className="flex flex-wrap items-center gap-2">
      <span>{data.workflow?.name ?? 'Unknown workflow'}</span>
      <span>&bull;</span>
      <span>Version v{data.workflowVersion.version}</span>
      <span>&bull;</span>
      <span>Started {formatDistanceToNow(data.startedAt, { addSuffix: true })}</span>
      {data.completedAt ? (
        <>
          <span>&bull;</span>
          <span>Completed {formatDistanceToNow(data.completedAt, { addSuffix: true })}</span>
        </>
      ) : null}
      {duration !== null ? (
        <>
          <span>&bull;</span>
          <span>Took {duration}</span>
        </>
      ) : null}
      <span>&bull;</span>
      <span>
        {data.nodes.length} nodes
        {failedNodes.length ? `, ${failedNodes.length} failed` : ''}
        {skippedNodes.length ? `, ${skippedNodes.length} skipped` : ''}
      </span>
      {data.error ? (
        <>
          <span>&bull;</span>
          <span className="text-rose-700">{data.error}</span>
        </>
      ) : failedNodes[0]?.error ? (
        <>
          <span>&bull;</span>
          <span className="text-rose-700">{failedNodes[0].error}</span>
        </>
      ) : null}
    </span>
  );

  return (
    <EntityItem
      href={`/executions/${data.id}`}
      title={formatStatus(data.status)}
      subtitle={subtitle}
      image={
        <div className="size-8 flex items-center justify-center">
          {getExecutionStatusIcon(data.status)}
        </div>
      }
      actions={<ExecutionStatusBadge status={data.status} />}
    />
  );
};
