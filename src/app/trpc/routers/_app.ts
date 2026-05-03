import { credentialsRouter } from '@/features/credentials/server/routers';
import { createTRPCRouter } from '../init';
import { workflowRouter } from '@/features/workflows/server/routers';
import { executionsRouter } from '@/features/executions/server/routers';
import { templateRouter } from '@/features/templates/server/routers';
import { workspaceMembersRouter, workspacesRouter } from '@/features/workspaces/server/routers';
import { workflowNodesRouter } from '@/features/workflow-nodes/server/routers';

export const appRouter = createTRPCRouter({
  workflows: workflowRouter,
  credentials: credentialsRouter,
  executions: executionsRouter,
  templates: templateRouter,
  workspaces: workspacesRouter,
  workspaceMembers: workspaceMembersRouter,
  workflowNodes: workflowNodesRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
