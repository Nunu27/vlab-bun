import { createFileRoute } from "@tanstack/react-router";
import LoadingPage from "@web/components/pages/loading-page";
import { protectedRoute } from "@web/lib/middlewares";
import { useAuthStore } from "@web/stores/auth-store";
import { lazy, Suspense } from "react";

const AdminDashboard = lazy(
	() => import("./(admin)/-module/components/admin-dashboard-page"),
);
const InstructorDashboard = lazy(
	() => import("./(instructor)/-module/components/instructor-dashboard-page"),
);
const StudentDashboard = lazy(
	() => import("./(student)/-module/components/student-dashboard-page"),
);

export const Route = createFileRoute("/_dashboard/")({
	staticData: { breadcrumbs: [{ title: "Dashboard" }] },
	beforeLoad: protectedRoute,
	component: RouteComponent,
});

function Dashboard() {
	const role = useAuthStore.use.user((user) => user?.role);

	switch (role) {
		case "admin":
			return <AdminDashboard />;
		case "instructor":
			return <InstructorDashboard />;
		case "student":
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
