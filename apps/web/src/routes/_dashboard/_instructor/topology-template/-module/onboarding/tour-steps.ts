import { TOPOLOGY_ID } from "@web/shared/topology/constants";
import type { DriveStep } from "driver.js";

export function buildTopologyTemplateTourSteps(): DriveStep[] {
	return [
		{
			popover: {
				title: "Reusable topologies",
				description:
					"Design a network topology once here, then apply it to any lab from its Topology tab instead of rebuilding it every time.",
			},
		},
		{
			element: '[data-tour="topology-template-name"]',
			popover: {
				title: "Name it",
				description:
					"Give it a descriptive name so it's easy to find when applying it to a lab later.",
				side: "bottom",
			},
		},
		{
			element: '[data-tour="device-palette"]',
			popover: {
				title: "Device palette",
				description: "Drag devices onto the canvas to build your topology.",
				side: "right",
			},
		},
		{
			element: `#${TOPOLOGY_ID.CANVAS}`,
			popover: {
				title: "The canvas",
				description:
					"Drag to pan, scroll to zoom. Click a device to configure it in the side panel.",
				side: "top",
			},
		},
		{
			element: '[data-tour="topology-toolbar"]',
			popover: {
				title: "Editing tools",
				description:
					"Switch to Connect mode to draw links between devices, group devices together, or delete what's selected.",
				side: "bottom",
			},
		},
		{
			element: '[data-tour="canvas-controls"]',
			popover: {
				title: "Navigate the canvas",
				description:
					"Fit to screen, zoom in or out, or check keyboard shortcuts here.",
				side: "left",
			},
		},
		{
			element: '[data-tour="topology-fullscreen-toggle"]',
			popover: {
				title: "Fullscreen",
				description: "Expand the canvas for more room to work.",
				side: "left",
			},
		},
		{
			popover: {
				title: "You're ready",
				description:
					"Save this template, then apply it from any lab's Topology tab. You can replay this tour anytime from the button next to the title.",
			},
		},
	];
}
