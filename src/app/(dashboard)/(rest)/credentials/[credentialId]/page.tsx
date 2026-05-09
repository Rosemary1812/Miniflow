import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{
    credentialId: string; // 修正为与文件夹名一致的字段名
  }>;
}

const Page = async ({ params }: PageProps) => {
  const { credentialId } = await params;
  redirect(`/providers/${credentialId}`);
};

export default Page;
