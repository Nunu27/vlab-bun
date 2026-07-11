import type { DriveStep } from "driver.js";

export function buildDeviceTemplateTourSteps(): DriveStep[] {
	return [
		{
			popover: {
				title: "Device templates",
				description:
					"A device template describes a reusable device that instructors can drop into any lab topology. Let's walk through the sections.",
			},
		},
		{
			element: '[data-tour="device-basic-info"]',
			popover: {
				title: "Basic information",
				description: "Name, kind, container image, icon, and category.",
				side: "top",
			},
		},
		{
			element: '[data-tour="device-resources"]',
			popover: {
				title: "Resources",
				description: "CPU and memory allocated to each running instance.",
				side: "top",
			},
		},
		{
			element: '[data-tour="device-cost"]',
			popover: {
				title: "Worker cost",
				description:
					"Used to decide which worker host can run this device. You can fill these in manually, or auto-measure them with Test Connection in the Connection section below.",
				side: "top",
			},
		},
		{
			element: '[data-tour="device-env"]',
			popover: {
				title: "Environment variables",
				description: "Passed to the device's container at deploy time.",
				side: "top",
			},
		},
		{
			element: '[data-tour="test-connection-button"]',
			popover: {
				title: "Test Connection",
				description:
					"Deploys the device once to verify connectivity and measures its actual CPU/memory usage, which you can then apply to the Worker Cost fields above.",
				side: "bottom",
			},
		},
		{
			element: '[data-tour="device-connection"]',
			popover: {
				title: "Connection",
				description:
					"Remote access configuration (SSH, VNC, or Telnet) used to give students a console into this device.",
				side: "top",
			},
		},
		{
			element: '[data-tour="device-interfaces"]',
			popover: {
				title: "Network interfaces",
				description:
					"Interfaces exposed by this device, used when wiring links to it in the topology editor.",
				side: "top",
			},
		},
		{
			popover: {
				title: "You're ready",
				description:
					"Save this template and it will appear in the device palette of the topology editor. You can replay this tour anytime from the button next to the title.",
			},
		},
	];
}
