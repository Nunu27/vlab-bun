import type { LabTopology } from "@vlab/shared/schemas";
import { Card, CardContent } from "@web/components/ui/card";
import api from "@web/lib/api";
import { TopologyStoreProvider } from "@web/shared/topology/stores";
import { TopologyLoader } from "./topology-loader";

export function TopologyTab({ topology }: { topology: LabTopology }) {
	api["device-template"].list.get.useSuspenseQuery();

	return (
		<Card className="flex h-200 flex-col overflow-hidden p-0">
			<CardContent className="flex flex-1 bg-background p-0">
				<TopologyStoreProvider>
					<TopologyLoader topology={topology} />
				</TopologyStoreProvider>
			</CardContent>
		</Card>
	);
}
