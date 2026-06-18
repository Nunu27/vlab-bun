import { Card, CardContent } from "@web/components/ui/card";
import TopologyCanvas from "@web/shared/topology/components/canvas";
import DevicePalette from "@web/shared/topology/components/device-palette";
import InterfaceSelectModal from "@web/shared/topology/components/modals/interface-select-modal";
import NodeProperties from "@web/shared/topology/components/properties";

import { ApplyTopologyTemplateModal } from "../modals/apply-topology-template-modal";

function LabTopologyForm() {
	return (
		<Card className="flex h-200 flex-col p-0">
			<CardContent className="relative flex flex-1 p-0">
				<ApplyTopologyTemplateModal />
				<DevicePalette />
				<TopologyCanvas />
				<NodeProperties />
			</CardContent>

			<InterfaceSelectModal />
		</Card>
	);
}

export default LabTopologyForm;
