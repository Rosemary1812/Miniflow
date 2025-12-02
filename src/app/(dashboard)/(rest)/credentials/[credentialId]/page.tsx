import { requireAuth } from '@/lib/auth-utils';

interface PageProps {
  params: Promise<{
    credentialId: string; // 修正为与文件夹名一致的字段名
  }>;
}

const Page = async ({ params }: PageProps) => {
  await requireAuth();
  const { credentialId } = await params;
  return <p>credentialsId:{credentialId}</p>;
};

export default Page;
