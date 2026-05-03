'use client';

import {
  useApproveWorkflow,
  useRejectWorkflow,
  useSubmitWorkflowReview,
  useSuspenseWorkflow,
} from '@/features/workflows/hooks/use-workflows';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { WorkspaceRole } from '@prisma/client';

export const WorkflowStatusBadge = ({ status }: { status?: string | null }) => {
  const normalizedStatus = status ?? 'NO_VERSION';
  const className =
    normalizedStatus === 'PUBLISHED' || normalizedStatus.startsWith('PUBLISHED')
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : normalizedStatus === 'PENDING_REVIEW'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : normalizedStatus === 'REJECTED'
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <Badge variant="outline" className={cn('h-6 rounded-full', className)}>
      {normalizedStatus}
    </Badge>
  );
};

export const PublishPanel = ({ workflowId }: { workflowId: string }) => {
  const { data: workflow } = useSuspenseWorkflow(workflowId);
  const submitReview = useSubmitWorkflowReview();
  const approve = useApproveWorkflow();
  const reject = useRejectWorkflow();
  const canSubmitReview = workflow.currentUserRole !== WorkspaceRole.VIEWER;
  const canPublish = workflow.currentUserRole === WorkspaceRole.OWNER;

  return (
    <Card className="h-full shadow-none">
      <CardHeader>
        <CardTitle>{workflow.name}</CardTitle>
        <CardDescription>Draft, review, and published version controls.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Draft status</span>
            <WorkflowStatusBadge status={workflow.draftVersion?.status} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Published version</span>
            <WorkflowStatusBadge
              status={
                workflow.publishedVersion
                  ? `PUBLISHED v${workflow.publishedVersion.version}`
                  : 'NOT PUBLISHED'
              }
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={
              !canSubmitReview ||
              submitReview.isPending ||
              workflow.draftVersion?.status !== 'DRAFT'
            }
            onClick={() => submitReview.mutate({ workflowId })}
          >
            Submit review
          </Button>
          <Button
            disabled={
              !canPublish || approve.isPending || workflow.draftVersion?.status !== 'PENDING_REVIEW'
            }
            onClick={() => approve.mutate({ workflowId })}
          >
            Approve and publish
          </Button>
          <Button
            variant="outline"
            disabled={
              !canPublish || reject.isPending || workflow.draftVersion?.status !== 'PENDING_REVIEW'
            }
            onClick={() => reject.mutate({ workflowId })}
          >
            Reject
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Version history</p>
          {workflow.versions.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No versions yet.
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {workflow.versions.map(version => (
                <div
                  key={version.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    v{version.version} · {version.name}
                  </span>
                  <WorkflowStatusBadge status={version.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
