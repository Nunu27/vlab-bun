import { createFileRoute } from "@tanstack/react-router";
import { useWSData, useWSEvent } from "@web/hooks/ws";
import api from "@web/lib/api";
import { queryClient } from "@web/lib/query";
import GuacamoleConnection from "@web/shared/guacamole/components/guacamole-connection";
import { GuacamoleConnectionStates } from "@web/shared/guacamole/components/guacamole-connection-states";
import { GuacamoleConnectionProvider } from "@web/shared/guacamole/stores/guacamole-connection-store";
import { useEffect } from "react";

export const Route = createFileRoute(
	"/lab/$labId/session/$labSessionId/node/$nodeId",
)({
	component: RouteComponent,
	loader: async ({ params: { labId, labSessionId, nodeId } }) => {
		await api
			.lab({ labId })
			.session({ labSessionId })
			.node({ id: nodeId })
			.get.ensureQueryData(queryClient);
	},
});

function RouteComponent() {
	const { labId, labSessionId, nodeId } = Route.useParams();

	const { data } = api
		.lab({ labId })
		.session({ labSessionId })
		.node({ id: nodeId })
		.get.useSuspenseQuery();
	const health = useWSData("node:[id]:health", {
		params: { id: nodeId },
		default: data.health ?? null,
	});

	useWSEvent("lab-session:[sessionId]:client-change", {
		params: { sessionId: labSessionId },
		handler: () => window.close(),
	});

	useEffect(() => {
		document.title = data.name;
	}, [data]);

	if (health === "starting") {
		return (
			<div className="relative h-screen w-screen overflow-hidden bg-black">
				<GuacamoleConnectionStates
					state="waiting"
					title="Node Starting"
					description="Waiting for node to be ready..."
				/>
			</div>
		);
	}

	if (health === "deleted") {
		return (
			<div className="relative h-screen w-screen overflow-hidden bg-black">
				<GuacamoleConnectionStates
					state="error"
					title="Node Deleted"
					description="This node has been deleted. Please close this window."
				/>
			</div>
		);
	}

	return (
		<GuacamoleConnectionProvider>
			<div className="h-screen w-screen overflow-hidden bg-black">
				<GuacamoleConnection
					token={data.token}
					onDisconnect={() => {
						window.close();
					}}
				/>
			</div>
		</GuacamoleConnectionProvider>
	);
}
