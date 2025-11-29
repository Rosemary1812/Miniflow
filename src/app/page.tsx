import { requireAuth } from '@/lib/auth-utils';
import { caller } from '@/app/trpc/server';
import { LogoutButton } from './logout';

const Page = async () => {
  await requireAuth();
  const data = await caller.getUsers();
  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center server flex-col gap-y-6">
      protected page
      <div>{JSON.stringify(data, null, 2)}</div>
      <LogoutButton />
    </div>
  );
};

export default Page;
