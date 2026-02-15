import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/_student/lab/$labId/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_dashboard/_student/lab/$id/"!</div>;
}
