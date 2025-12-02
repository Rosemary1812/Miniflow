import { requireAuth } from '@/lib/auth-utils';
const Page = async () => {
  await requireAuth();

  return <p>fjksdhgbjk</p>;
};
export default Page;
