import { McpServerForm } from '@/features/mcp/components/mcp-server-form';
import { requireAuth } from '@/lib/auth-utils';

const Page = async () => {
  await requireAuth();
  return (
    <div className="h-full p-4 md:px-10 md:py-6">
      <div className="mx-auto flex h-full w-full max-w-screen-md flex-col gap-y-8">
        <McpServerForm />
      </div>
    </div>
  );
};

export default Page;
