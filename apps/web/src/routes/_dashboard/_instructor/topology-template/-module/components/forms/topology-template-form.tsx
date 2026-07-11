import type { LabTopology } from "@vlab/shared/schemas/lab";
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
			<div data-tour="topology-template-name">
				<form.AppField name="name">
					{(field) => (
						<field.TextField
							label="Template Name"
							placeholder="E.g. OSPF Basic Topology"
							required
						/>
					)}
				</form.AppField>
			</div>

			<div
				ref={ref}
				className="relative flex h-150 w-full overflow-hidden rounded-xl border bg-background shadow-sm"
			>
				<button
					type="button"
					data-tour="topology-fullscreen-toggle"
					onClick={toggleFullscreen}
					className="absolute top-4 right-4 z-10 rounded-md bg-background/80 p-2 text-muted-foreground shadow-sm backdrop-blur-sm hover:bg-accent hover:text-accent-foreground"
				>
					{isFullscreen ? (
						<Minimize2Icon className="size-4" />
					) : (
						<Maximize2Icon className="size-4" />
					)}
				</button>
				<DevicePalette />
				<TopologyCanvas />
				<NodeProperties />
				<InterfaceSelectModal />
			</div>
		</div>
	);
}
