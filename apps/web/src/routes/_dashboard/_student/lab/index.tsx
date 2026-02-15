import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/_student/lab/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_dashboard/(student)/lab/"!</div>;
}
