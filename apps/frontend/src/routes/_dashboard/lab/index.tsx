import LoadingPage from '@frontend/components/pages/loading';
import NotFoundPage from '@frontend/components/pages/not-found';
import { privateRoute } from '@frontend/lib/middlewares';
import { getTitleFromBreadcrumbs } from '@frontend/lib/utils';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const LecturerLabPage = lazy(
  () => import('./-module/components/pages/lecturer-lab-page'),
);
const StudentLabPage = lazy(
  () => import('./-module/components/pages/student-lab-page'),
);

const breadcrumbs = [{ title: 'Labs' }];

export const Route = createFileRoute('/_dashboard/lab/')({
  head: () => ({
    meta: [{ title: getTitleFromBreadcrumbs(breadcrumbs) }],
  }),
  beforeLoad: ({ context }) => {
    privateRoute(['student', 'lecturer', 'admin'])({ context });

    context.breadcrumbs = breadcrumbs;
  },
  component: RouteComponent,
});

function LabDashboard() {
  const role = Route.useRouteContext({ select: (ctx) => ctx.auth.user!.role });

  switch (role) {
    case 'admin':
      return <NotFoundPage />;
    case 'lecturer':
      return <LecturerLabPage />;
    case 'student':
      return <StudentLabPage />;
  }
}

function RouteComponent() {
  return (
    <Suspense fallback={<LoadingPage message="Loading Labs..." />}>
      <LabDashboard />
    </Suspense>
  );
}
