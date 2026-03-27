'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircleIcon, XCircleIcon } from 'lucide-react';

interface WorkflowStat {
  workflowId: string;
  name: string;
  total: number;
  success: number;
  failed: number;
  successRate: number;
}

interface WorkflowStatsTableProps {
  workflows: WorkflowStat[];
}

export const WorkflowStatsTable = ({ workflows }: WorkflowStatsTableProps) => {
  if (workflows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow Breakdown</CardTitle>
          <CardDescription>Execution counts per workflow</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 px-4 text-muted-foreground text-sm">
          No executions found in this period.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[240px] flex flex-col">
      <CardHeader className="shrink-0 pb-2">
        <CardTitle>Workflow Breakdown</CardTitle>
        <CardDescription>Execution counts per workflow</CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 sticky top-0 z-10">
              <th className="text-left py-3 px-2 font-medium text-muted-foreground">Workflow</th>
              <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total</th>
              <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                <span className="flex items-center justify-end gap-1">
                  <CheckCircleIcon className="size-3 text-green-500" />
                  Success
                </span>
              </th>
              <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                <span className="flex items-center justify-end gap-1">
                  <XCircleIcon className="size-3 text-red-500" />
                  Failed
                </span>
              </th>
              <th className="text-right py-3 px-2 font-medium text-muted-foreground">Success Rate</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map(wf => (
              <tr key={wf.workflowId} className="border-b last:border-0 hover:bg-muted/50">
                <td className="py-3 px-2">
                  <Link
                    href={`/executions?workflowId=${wf.workflowId}`}
                    className="text-primary hover:underline"
                  >
                    {wf.name}
                  </Link>
                </td>
                <td className="py-3 px-2 text-right font-mono">{wf.total}</td>
                <td className="py-3 px-2 text-right font-mono text-green-600">{wf.success}</td>
                <td className="py-3 px-2 text-right font-mono text-red-600">{wf.failed}</td>
                <td className="py-3 px-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 bg-muted rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          wf.successRate >= 80
                            ? 'bg-green-500'
                            : wf.successRate >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${wf.successRate}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs w-8 text-right">{wf.successRate}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};
