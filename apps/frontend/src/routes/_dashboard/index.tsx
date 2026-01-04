import LoadingPage from '@frontend/components/pages/loading-page';
import { menuByRole } from '@frontend/constants/menu';
import { useAuthStore } from '@frontend/stores/auth';
import { createFileRoute, redirect } from '@tanstack/react-router';
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

const breadcrumbs = [{ title: 'Dashboard' }];

export const Route = createFileRoute('/_dashboard/')({
  staticData: { breadcrumbs },
  beforeLoad: () => {
    const role = useAuthStore.getState().user!.role;
    const menu = menuByRole[role];

    for (const item of menu) {
      for (const subItem of item.items) {
        if ('url' in subItem) {
          throw redirect({ to: subItem.url });
        }
      }
    }
  },
  component: RouteComponent,
});

function Dashboard() {
  const role = useAuthStore.use.user((user) => user!.role);

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
    <Suspense fallback={<LoadingPage message="Loading Dashboard..." />}>
      <Dashboard />
    </Suspense>
  );
}
