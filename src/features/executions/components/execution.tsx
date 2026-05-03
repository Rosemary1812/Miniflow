'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ExecutionNodeStatus } from '@prisma/client';
import {
  AlertTriangleIcon,
  BotIcon,
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  XCircleIcon,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSuspenseExecution } from '../hooks/use-executions';
import { ExecutionStatusBadge, formatDuration, formatStatus } from './executions';
import { cn } from '@/lib/utils';

const SENSITIVE_KEY_PATTERN = /api[-_]?key|token|password|secret|authorization|credential/i;

const redactJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(item => redactJson(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : redactJson(item),
      ]),
    );
  }
  return value;
};

const JsonViewer = ({ value, empty = 'No data' }: { value: unknown; empty?: string }) => {
  if (value === null || value === undefined || value === '') {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
      {typeof value === 'string' ? value : JSON.stringify(redactJson(value), null, 2)}
    </pre>
  );
};

const DetailField = ({ label, children }: { label: string; children: React.ReactNode }) => {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
};

const getNodeStatusIcon = (status: ExecutionNodeStatus) => {
  switch (status) {
    case ExecutionNodeStatus.SUCCESS:
      return <CheckCircle2Icon className="size-4 text-emerald-600" />;
    case ExecutionNodeStatus.FAILED:
      return <XCircleIcon className="size-4 text-rose-600" />;
    case ExecutionNodeStatus.RUNNING:
      return <Loader2Icon className="size-4 animate-spin text-blue-600" />;
    case ExecutionNodeStatus.SKIPPED:
      return <ClockIcon className="size-4 text-slate-500" />;
    default:
      return <ClockIcon className="size-4 text-amber-600" />;
  }
};

const ExecutionSummaryCard = ({
  execution,
}: {
  execution: ReturnType<typeof useSuspenseExecution>['data'];
}) => {
  const failedNodes = execution.nodes.filter(node => node.status === ExecutionNodeStatus.FAILED);
  const skippedNodes = execution.nodes.filter(node => node.status === ExecutionNodeStatus.SKIPPED);

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ExecutionStatusBadge status={execution.status} />
              {formatStatus(execution.status)}
            </CardTitle>
            <CardDescription>Execution summary</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <DetailField label="Workflow">
          <Link
            prefetch
            className="text-primary hover:underline"
            href={`/workflows/${execution.workflowId}`}
          >
            {execution.workflow?.name ?? 'Unknown workflow'}
          </Link>
        </DetailField>
        <div className="grid grid-cols-2 gap-4">
          <DetailField label="Version">v{execution.workflowVersion.version}</DetailField>
          <DetailField label="Duration">
            {formatDuration(execution.startedAt, execution.completedAt)}
          </DetailField>
          <DetailField label="Started">
            {formatDistanceToNow(execution.startedAt, { addSuffix: true })}
          </DetailField>
          <DetailField label="Completed">
            {execution.completedAt
              ? formatDistanceToNow(execution.completedAt, { addSuffix: true })
              : 'Running'}
          </DetailField>
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-md border p-2">
            <p className="text-lg font-semibold">{execution.nodes.length}</p>
            <p className="text-xs text-muted-foreground">Nodes</p>
          </div>
          <div className="rounded-md border p-2">
            <p className="text-lg font-semibold text-rose-600">{failedNodes.length}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
          <div className="rounded-md border p-2">
            <p className="text-lg font-semibold text-slate-600">{skippedNodes.length}</p>
            <p className="text-xs text-muted-foreground">Skipped</p>
          </div>
        </div>
        {execution.error ? (
          <Alert variant="destructive">
            <AlertTriangleIcon className="size-4" />
            <AlertTitle>Execution failed</AlertTitle>
            <AlertDescription>{execution.error}</AlertDescription>
          </Alert>
        ) : null}
        {execution.output ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Output</p>
            <JsonViewer value={execution.output} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

const ExecutionNodeTimeline = ({
  nodes,
  selectedNodeId,
  onSelect,
}: {
  nodes: ReturnType<typeof useSuspenseExecution>['data']['nodes'];
  selectedNodeId?: string;
  onSelect: (nodeId: string) => void;
}) => {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Node timeline</CardTitle>
        <CardDescription>Inputs, outputs, retries, and skipped branches.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[620px] pr-3">
          <div className="space-y-2">
            {nodes.map(node => (
              <button
                key={node.id}
                className={cn(
                  'w-full rounded-md border p-3 text-left transition-colors hover:bg-muted',
                  selectedNodeId === node.id && 'border-primary bg-muted',
                )}
                onClick={() => onSelect(node.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      {getNodeStatusIcon(node.status)}
                      <p className="truncate text-sm font-medium">{node.nodeName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {node.nodeType} · attempt {node.attempt} · retries {node.retryCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {node.durationMs ?? 0}ms
                      {node.nextRetryAt
                        ? ` · next retry ${formatDistanceToNow(node.nextRetryAt, {
                            addSuffix: true,
                          })}`
                        : ''}
                    </p>
                  </div>
                  <ExecutionStatusBadge status={node.status} />
                </div>
                {node.error ? (
                  <p className="mt-2 line-clamp-2 text-xs text-rose-700">{node.error}</p>
                ) : null}
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

const AiTracePanel = ({
  node,
}: {
  node: ReturnType<typeof useSuspenseExecution>['data']['nodes'][number];
}) => {
  const hasAiTrace =
    node.provider ||
    node.model ||
    node.systemPrompt ||
    node.userPrompt ||
    node.resolvedPrompt ||
    node.responseText ||
    node.tokenUsageTotal;

  if (!hasAiTrace) {
    return null;
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BotIcon className="size-4" />
          AI trace
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <DetailField label="Provider">{node.provider ?? 'N/A'}</DetailField>
          <DetailField label="Model">{node.model ?? 'N/A'}</DetailField>
          <DetailField label="Prompt tokens">{node.tokenUsagePrompt ?? 0}</DetailField>
          <DetailField label="Completion tokens">{node.tokenUsageCompletion ?? 0}</DetailField>
        </div>
        <DetailField label="Total tokens">{node.tokenUsageTotal ?? 0}</DetailField>
        <DetailField label="System prompt">
          <JsonViewer value={node.systemPrompt} empty="No system prompt" />
        </DetailField>
        <DetailField label="User prompt">
          <JsonViewer value={node.userPrompt} empty="No user prompt" />
        </DetailField>
        <DetailField label="Resolved prompt">
          <JsonViewer value={node.resolvedPrompt} empty="No resolved prompt" />
        </DetailField>
        <DetailField label="Response">
          <JsonViewer value={node.responseText} empty="No response" />
        </DetailField>
      </CardContent>
    </Card>
  );
};

const ExecutionNodeDetailPanel = ({
  node,
}: {
  node?: ReturnType<typeof useSuspenseExecution>['data']['nodes'][number];
}) => {
  if (!node) {
    return (
      <Card className="shadow-none">
        <CardContent className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          No node logs recorded for this execution.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{node.nodeName}</CardTitle>
              <CardDescription>{node.nodeType}</CardDescription>
            </div>
            <ExecutionStatusBadge status={node.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Attempt">{node.attempt}</DetailField>
            <DetailField label="Retry count">{node.retryCount}</DetailField>
            <DetailField label="Duration">{node.durationMs ?? 0}ms</DetailField>
            <DetailField label="Max attempts">{node.maxAttempts}</DetailField>
          </div>
          {node.lastError ? (
            <Alert variant="destructive">
              <AlertTriangleIcon className="size-4" />
              <AlertTitle>Last error</AlertTitle>
              <AlertDescription>{node.lastError}</AlertDescription>
            </Alert>
          ) : null}
          {node.error ? (
            <DetailField label="Error">
              <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{node.error}</p>
            </DetailField>
          ) : null}
          {node.errorStack ? (
            <DetailField label="Error stack">
              <JsonViewer value={node.errorStack} />
            </DetailField>
          ) : null}
          <div className="grid gap-4 xl:grid-cols-2">
            <DetailField label="Input">
              <JsonViewer value={node.input} empty="No input" />
            </DetailField>
            <DetailField label="Output">
              <JsonViewer value={node.output} empty="No output" />
            </DetailField>
          </div>
        </CardContent>
      </Card>
      <AiTracePanel node={node} />
    </div>
  );
};

export const ExecutionView = ({ executionId }: { executionId: string }) => {
  const { data: execution } = useSuspenseExecution(executionId);
  const defaultNodeId = useMemo(
    () =>
      execution.nodes.find(node => node.status === ExecutionNodeStatus.FAILED)?.id ??
      execution.nodes[0]?.id,
    [execution.nodes],
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(defaultNodeId);
  const selectedNode =
    execution.nodes.find(node => node.id === selectedNodeId) ??
    execution.nodes.find(node => node.id === defaultNodeId);

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-[320px_minmax(320px,420px)_1fr]">
      <ExecutionSummaryCard execution={execution} />
      <ExecutionNodeTimeline
        nodes={execution.nodes}
        selectedNodeId={selectedNode?.id}
        onSelect={setSelectedNodeId}
      />
      <ExecutionNodeDetailPanel node={selectedNode} />
    </div>
  );
};
