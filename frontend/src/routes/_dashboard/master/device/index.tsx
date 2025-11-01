import { PageHeading } from '@frontend/components/page-heading';
import { Button } from '@frontend/components/ui/button';
import { privateRoute } from '@frontend/lib/middlewares';
import { createFileRoute, Link } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

export const Route = createFileRoute('/_dashboard/master/device/')({
  beforeLoad: ({ context }) => {
    privateRoute(['admin'])({ context });

    context.breadcrumbs = [{ title: 'Master', url: '#' }, { title: 'Device' }];
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <PageHeading
        title="Devices"
        subtitle="Manage devices that can be used in the lab."
        actions={
          <Button size="lg" asChild>
            <Link to="/">
              <PlusIcon /> Add Device
            </Link>
          </Button>
        }
      />
    </div>
  );
}
