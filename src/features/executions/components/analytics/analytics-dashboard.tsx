'use client';

import { useState } from 'react';
import { BarChart3Icon, PlayIcon, PlusIcon } from 'lucide-react';
import { SummaryCards } from './summary-cards';
import { ExecutionTrendChart } from './execution-trend-chart';
import { SuccessRateChart } from './success-rate-chart';
import { WorkflowStatsTable } from './workflow-stats-table';
import { useTRPC } from '@/app/trpc/client';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const DAY_OPTIONS = [
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 14 days', value: '14' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 60 days', value: '60' },
  { label: 'Last 90 days', value: '90' },
];

const EmptyState = () => (
  <Card className="col-span-full">
    <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="rounded-full bg-muted p-4">
        <BarChart3Icon className="size-8 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-base font-medium">No execution data yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Run your first workflow to start seeing analytics.
        </p>
      </div>
      <Link href="/workflows">
        <Button size="sm">
          <PlusIcon className="size-4 mr-1" />
          Create Workflow
        </Button>
      </Link>
    </CardContent>
  </Card>
);

export const AnalyticsDashboard = () => {
  const [days, setDays] = useState('30');
  const trpc = useTRPC();

  const analytics = useQuery(
    trpc.executions.getAnalytics.queryOptions({ days: parseInt(days) }),
  );

  if (analytics.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[100px] rounded-lg border animate-pulse bg-muted" />
          ))}
        </div>
        <div className="h-[300px] rounded-lg border animate-pulse bg-muted" />
      </div>
    );
  }

  if (analytics.isError || !analytics.data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Failed to load analytics. Please try again.
        </CardContent>
      </Card>
    );
  }

  const { summary, trend, byWorkflow } = analytics.data;

  // Show empty state when there's no data at all
  if (summary.total === 0) {
    return (
      <div className="space-y-6">
        {/* Period selector always visible */}
        <div className="flex justify-end">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-muted-foreground">—</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="rounded-full bg-muted p-4">
              <BarChart3Icon className="size-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-base font-medium">No execution data yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Run your first workflow to start seeing analytics.
              </p>
            </div>
            <Link href="/workflows">
              <Button size="sm">
                <PlusIcon className="size-4 mr-1" />
                Create Workflow
              </Button>
            </Link>
          </CardContent>
        </Card>
        <WorkflowStatsTable workflows={byWorkflow} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex justify-end">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <SummaryCards
        total={summary.total}
        success={summary.success}
        failed={summary.failed}
        successRate={summary.successRate}
      />

      {/* Execution trend — full width */}
      <ExecutionTrendChart
        labels={trend.labels}
        success={trend.success}
        failed={trend.failed}
        total={trend.total}
      />

      {/* Success rate + Workflow breakdown side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        <SuccessRateChart success={summary.success} failed={summary.failed} />
        <WorkflowStatsTable workflows={byWorkflow} />
      </div>
    </div>
  );
};
