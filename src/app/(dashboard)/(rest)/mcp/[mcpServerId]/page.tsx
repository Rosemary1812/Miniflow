import { ErrorBoundary } from '@sentry/nextjs';
import { Suspense } from 'react';
import { ErrorView, LoadingView } from '@/components/entity-components';
import { McpServerView } from '@/features/mcp/components/mcp-server-view';
import { requireAuth } from '@/lib/auth-utils';

type Props = {
  params: Promise<{
    mcpServerId: string;
  }>;
};

const Page = async ({ params }: Props) => {
  await requireAuth();
  const { mcpServerId } = await params;

  return (
    <div className="h-full p-4 md:px-10 md:py-6">
      <div className="mx-auto flex h-full w-full max-w-screen-md flex-col gap-y-8">
        <ErrorBoundary fallback={<ErrorView message="Error loading MCP server..." />}>
          <Suspense fallback={<LoadingView message="Loading MCP server..." />}>
            <McpServerView mcpServerId={mcpServerId} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default Page;
