import { Card, CardContent } from "@web/components/ui/card";
import TopologyCanvas from "@web/shared/topology/components/canvas";
import DevicePalette from "@web/shared/topology/components/device-palette";
import InterfaceSelectModal from "@web/shared/topology/components/modals/interface-select-modal";
import NodeProperties from "@web/shared/topology/components/properties";

function LabTopologyForm() {
	return (
		<Card className="flex h-200 flex-col p-0">
			<CardContent className="flex flex-1 p-0">
				<DevicePalette />
				<TopologyCanvas />
				<NodeProperties />
			</CardContent>

			<InterfaceSelectModal />
		</Card>
	);
}

export default LabTopologyForm;
