import { requireAuth } from '@/lib/auth-utils';
const Page = async () => {
  await requireAuth();
  return <p>execution</p>;
};
export default Page;
