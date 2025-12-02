interface PageProps {
  params: Promise<{
    executionId: string; // 修正为与文件夹名一致的字段名
  }>;
}
import { requireAuth } from '@/lib/auth-utils';

const Page = async ({ params }: PageProps) => {
  await requireAuth();
  const { executionId } = await params;
  return <p>excutionId:{executionId}</p>;
};

export default Page;
