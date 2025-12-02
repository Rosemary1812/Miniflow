import { requireAuth } from '@/lib/auth-utils';
const Page = async () => {
  await requireAuth();
  return <p>credentials</p>;
};
export default Page;
