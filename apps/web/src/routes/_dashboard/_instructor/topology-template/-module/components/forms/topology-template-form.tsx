import type { LabTopology } from "@vlab/shared/schemas/lab";
import { Card, CardContent } from "@web/components/ui/card";
import type { useApiForm } from "@web/hooks/form/use-api-form";
import TopologyCanvas from "@web/shared/topology/components/canvas";
import DevicePalette from "@web/shared/topology/components/device-palette";
import InterfaceSelectModal from "@web/shared/topology/components/modals/interface-select-modal";
import NodeProperties from "@web/shared/topology/components/properties";
import { useTopologyStore } from "@web/shared/topology/stores";
import { Maximize2Icon, Minimize2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";

export function TopologyTemplateForm({
	form,
}: {
	form: ReturnType<typeof useApiForm>;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);

	const toggleFullscreen = () => {
		if (!ref.current) return;
		if (document.fullscreenElement) {
			document.exitFullscreen();
			setIsFullscreen(false);
		} else {
			ref.current.requestFullscreen();
			setIsFullscreen(true);
		}
	};

	const store = useTopologyStore();

	const updateTopology = useDebounceCallback(() => {
		const { deviceCounts, devices, groups, notes, edges } = store.getState();

		form.setFieldValue("topology", {
			deviceCounts,
			devices,
			groups,
			notes,
			edges,
		} as LabTopology);
	});

	useEffect(() => {
		return store.subscribe(() => {
			updateTopology();
		});
	}, [store.subscribe, updateTopology]);

	return (
		<div className="space-y-6">
			<Card>
				<CardContent className="space-y-4 pt-6">
					<form.AppField name="name">
						{(field) => (
							<field.TextField
								label="Template Name"
								placeholder="E.g. OSPF Basic Topology"
								required
							/>
						)}
					</form.AppField>
				</CardContent>
			</Card>

			<Card className="flex flex-col">
				<CardContent className="p-0">
					<div
						ref={ref}
						className="relative flex h-[600px] w-full bg-background"
					>
						<button
							type="button"
							onClick={toggleFullscreen}
							className="absolute top-4 right-4 z-10 rounded-md bg-background/80 p-2 text-muted-foreground shadow-sm backdrop-blur-sm hover:bg-accent hover:text-accent-foreground"
						>
							{isFullscreen ? (
								<Minimize2Icon className="h-4 w-4" />
							) : (
								<Maximize2Icon className="h-4 w-4" />
							)}
						</button>
						<DevicePalette />
						<TopologyCanvas />
						<NodeProperties />
						<InterfaceSelectModal />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
