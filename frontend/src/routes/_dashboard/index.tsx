import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const AdminDashboard = lazy(
  () => import('./-module/components/pages/admin-dashboard'),
);
const LecturerDashboard = lazy(
  () => import('./-module/components/pages/lecturer-dashboard'),
);
const StudentDashboard = lazy(
  () => import('./-module/components/pages/student-dashboard'),
);

export const Route = createFileRoute('/_dashboard/')({
  beforeLoad: ({ context }) => {
    context.breadcrumbs = [{ title: 'Dashboard' }];
  },
  component: RouteComponent,
});

function Dashboard() {
  const role = Route.useRouteContext({ select: (ctx) => ctx.auth.user!.role });

  switch (role) {
    case 'admin':
      return <AdminDashboard />;
    case 'lecturer':
      return <LecturerDashboard />;
    case 'student':
      return <StudentDashboard />;
  }
}

function RouteComponent() {
  return (
    <Suspense fallback={<div>Loading Dashboard...</div>}>
      <Dashboard />
    </Suspense>
  );
}
