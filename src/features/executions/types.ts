import type { Realtime } from '@inngest/realtime';
import type { GetStepTools, Inngest } from 'inngest';
export type WorkflowContext = Record<string, unknown>;

export type StepTools = GetStepTools<Inngest.Any>;

export interface NodeExecutorParams<TData = Record<string, unknown>> {
  data: TData;
  nodeId: string;
  executionId?: string;
  attempt?: number;
  idempotencyKey?: string;
  userId: string;
  workspaceId: string;
  context: WorkflowContext;
  step: StepTools;
  publish: Realtime.PublishFn;
}

export type NodeExecutor<TData = Record<string, unknown>> = (
  params: NodeExecutorParams<TData>,
) => Promise<WorkflowContext>;
