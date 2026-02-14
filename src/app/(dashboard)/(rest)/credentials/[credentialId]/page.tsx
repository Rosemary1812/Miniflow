import { HydrateClient } from '@/app/trpc/server';
import { CredentialView } from '@/features/credentials/components/credential';
import {
  CredentialsError,
  CredentialsLoading,
} from '@/features/credentials/components/credentials';
import { requireAuth } from '@/lib/auth-utils';
import { ErrorBoundary } from 'react-error-boundary';
import { Suspense } from 'react';

interface PageProps {
  params: Promise<{
    credentialId: string; // 修正为与文件夹名一致的字段名
  }>;
}

const Page = async ({ params }: PageProps) => {
  await requireAuth();
  const { credentialId } = await params;

  return (
    <div className="p-4 md:px-10 md:py-6 h-full">
      <div className="mx-auto max-w-screen-md w-full flex flex-col">
        <HydrateClient>
          <ErrorBoundary fallback={<CredentialsError />}>
            <Suspense fallback={<CredentialsLoading />}>
              <CredentialView credentialId={credentialId} />
            </Suspense>
          </ErrorBoundary>
        </HydrateClient>
      </div>
    </div>
  );
};

export default Page;
