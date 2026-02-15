import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_dashboard/_student/lab/$labId/session/$sessionId/",
)({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_dashboard/_student/lab/$labId/session/$sessionId"!</div>;
}
