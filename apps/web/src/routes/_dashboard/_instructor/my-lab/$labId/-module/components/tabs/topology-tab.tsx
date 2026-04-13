import type { LabTopology } from "@vlab/shared/schemas";
import { Card, CardContent } from "@web/components/ui/card";
import api from "@web/lib/api";
import TopologyCanvas from "@web/shared/topology/components/canvas";
import { TopologyStoreProvider } from "@web/shared/topology/stores";

export function TopologyTab({ topology }: { topology: LabTopology }) {
	const { data: categorizedTemplates } =
		api["device-template"].list.get.useSuspenseQuery();

	return (
		<Card className="p-0">
			<CardContent className="flex h-200 p-0">
				<TopologyStoreProvider
					isEditor={false}
					categorizedTemplates={categorizedTemplates}
					topology={topology}
				>
					<TopologyCanvas />
				</TopologyStoreProvider>
			</CardContent>
		</Card>
	);
}
