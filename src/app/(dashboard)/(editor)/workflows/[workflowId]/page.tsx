import { requireAuth } from '@/lib/auth-utils';

interface PageProps {
  params: Promise<{
    workflowId: string; // 修正为与文件夹名一致的字段名
  }>;
}

const Page = async ({ params }: PageProps) => {
  await requireAuth();
  const { workflowId } = await params;
  return <p>workflowId:{workflowId}</p>;
};

export default Page;
