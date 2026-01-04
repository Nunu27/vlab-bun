import LoadingPage from '@frontend/components/pages/loading-page';
import NotFoundPage from '@frontend/components/pages/not-found-page';
import { privateRoute } from '@frontend/lib/middlewares';
import { useAuthStore } from '@frontend/stores/auth';
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
  staticData: { breadcrumbs },
  beforeLoad: privateRoute(['student', 'lecturer', 'admin']),
  component: RouteComponent,
});

function LabDashboard() {
  const role = useAuthStore.use.user((user) => user!.role);

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
