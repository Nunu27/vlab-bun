import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_dashboard/')({
  beforeLoad: ({ context }) => {
    context.breadcrumbs = [{ title: 'Dashboard' }];
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_dashboard/"!</div>;
}
