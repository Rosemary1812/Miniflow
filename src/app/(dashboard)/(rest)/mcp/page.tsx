import { McpServersPage } from '@/features/mcp/components/mcp-servers-page';
import { requireAuth } from '@/lib/auth-utils';

const Page = async () => {
  await requireAuth();
  return <McpServersPage />;
};

export default Page;
