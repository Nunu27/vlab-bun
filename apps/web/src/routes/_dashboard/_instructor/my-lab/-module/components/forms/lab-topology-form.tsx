import { Card, CardContent } from "@web/components/ui/card";
import TopologyCanvas from "@web/shared/topology/components/canvas";
import DevicePalette from "@web/shared/topology/components/device-palette";
import NodeProperties from "@web/shared/topology/components/properties";

function LabTopologyForm() {
	return (
		<Card className="flex h-200 flex-col overflow-hidden p-0">
			<CardContent className="flex flex-1 bg-background p-0">
				<DevicePalette />
				<TopologyCanvas />
				<NodeProperties />
			</CardContent>
		</Card>
	);
}

export default LabTopologyForm;
