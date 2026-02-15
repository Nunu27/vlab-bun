import type { LabTopology } from "@vlab/shared/schemas";
import api from "@web/lib/api";
import TopologyCanvas from "@web/shared/topology/components/canvas";
import NodeProperties from "@web/shared/topology/components/properties";
import { useTopologyStore } from "@web/shared/topology/stores";
import { useEffect } from "react";

export function TopologyLoader({ topology }: { topology: LabTopology }) {
	const store = useTopologyStore();
	const { data: categories } =
		api["device-template"].list.get.useSuspenseQuery();

	useEffect(() => {
		if (categories) {
			store.getState().actions.load({
				categorizedTemplates: categories,
				sessionId: "view",
				...topology,
			});
		}
	}, [categories, store, topology]);

	return (
		<>
			<TopologyCanvas />
			<NodeProperties />
		</>
	);
}
