import { PageHeading } from '@frontend/components/page-heading';
import { Button } from '@frontend/components/ui/button';
import { privateRoute } from '@frontend/lib/middlewares';
import { createFileRoute, Link } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

export const Route = createFileRoute('/_dashboard/user/admin/')({
  beforeLoad: ({ context }) => {
    privateRoute(['admin'])({ context });

    context.breadcrumbs = [{ title: 'User', url: '#' }, { title: 'Admin' }];
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <PageHeading
        title="Admins"
        subtitle="Manage administrative users with elevated privileges."
        actions={
          <Button size="lg" asChild>
            <Link to="/">
              <PlusIcon /> Create Admin
            </Link>
          </Button>
        }
      />
    </div>
  );
}
