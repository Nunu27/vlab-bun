import { createFileRoute, Outlet } from "@tanstack/react-router";
import { privateRoute } from "@web/lib/middlewares";

export const Route = createFileRoute("/_dashboard/_admin")({
	beforeLoad: privateRoute(["admin"]),
	component: RouteComponent,
});

function RouteComponent() {
	return <Outlet />;
}
