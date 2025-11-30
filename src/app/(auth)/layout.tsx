import { AuthLayout } from '@/features/auth/components/layout';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <AuthLayout>{children}</AuthLayout>;
};
export default Layout;
