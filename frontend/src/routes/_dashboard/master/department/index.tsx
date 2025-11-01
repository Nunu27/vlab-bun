import { PageHeading } from '@frontend/components/page-heading';
import { Button } from '@frontend/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@frontend/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
  PaginationNext,
} from '@frontend/components/ui/pagination';
import { privateRoute } from '@frontend/lib/middlewares';
import { createFileRoute, Link } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

export const Route = createFileRoute('/_dashboard/master/department/')({
  beforeLoad: ({ context }) => {
    privateRoute(['admin'])({ context });

    context.breadcrumbs = [
      { title: 'Master', url: '#' },
      { title: 'Department' },
    ];
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-2">
      <PageHeading
        title="Departments"
        subtitle="Manage academic departments within the institution."
        actions={
          <Button size="lg" asChild>
            <Link to="/">
              <PlusIcon /> Add Department
            </Link>
          </Button>
        }
      />
      <Card>
        <CardHeader></CardHeader>
        <CardContent></CardContent>
        <CardFooter>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive>
                  2
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">3</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardFooter>
      </Card>
    </div>
  );
}
