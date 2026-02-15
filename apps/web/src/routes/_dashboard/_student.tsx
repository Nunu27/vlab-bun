import { createFileRoute, Outlet } from "@tanstack/react-router";
import { privateRoute } from "@web/lib/middlewares";

export const Route = createFileRoute("/_dashboard/_student")({
	beforeLoad: privateRoute(["student"]),
	component: RouteComponent,
});

function RouteComponent() {
	return <Outlet />;
}
