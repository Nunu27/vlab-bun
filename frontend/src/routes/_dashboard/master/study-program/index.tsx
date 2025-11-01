import { PageHeading } from '@frontend/components/page-heading';
import { Button } from '@frontend/components/ui/button';
import { privateRoute } from '@frontend/lib/middlewares';
import { createFileRoute, Link } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

export const Route = createFileRoute('/_dashboard/master/study-program/')({
  beforeLoad: ({ context }) => {
    privateRoute(['admin'])({ context });

    context.breadcrumbs = [
      { title: 'Master', url: '#' },
      { title: 'Study Program' },
    ];
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <PageHeading
        title="Study Programs"
        subtitle="Manage study programs offered in the institution."
        actions={
          <Button size="lg" asChild>
            <Link to="/">
              <PlusIcon /> Add Study Program
            </Link>
          </Button>
        }
      />
    </div>
  );
}
