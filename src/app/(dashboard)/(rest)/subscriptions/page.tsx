import { requireAuth } from '@/lib/auth-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Page = async () => {
  await requireAuth();

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Subscription</h1>
      <Card>
        <CardHeader>
          <CardTitle>Pro Plan</CardTitle>
          <CardDescription>Upgrade to unlock unlimited workflows and advanced features.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Subscription management coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
export default Page;
