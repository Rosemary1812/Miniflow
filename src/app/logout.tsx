'use client';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export const LogoutButton = () => {
  const router = useRouter();
  return (
    <Button
      onClick={async () => {
        await authClient.signOut(
          { callbackURL: '/login' },
          {
            onSuccess: () => {
              router.replace('/login');
              router.refresh();
            },
          },
        );
      }}
    >
      logout
    </Button>
  );
};
