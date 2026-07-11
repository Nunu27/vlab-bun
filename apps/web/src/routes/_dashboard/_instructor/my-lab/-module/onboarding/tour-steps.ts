import { TOPOLOGY_ID } from "@web/shared/topology/constants";
import type { Driver, DriveStep } from "driver.js";

export type LabFormTab = "basic" | "topology" | "instructions";

function goToTab(
	setActiveTab: (tab: LabFormTab) => void,
	tab: LabFormTab,
	driver: Driver,
	advance: (driver: Driver) => void,
) {
	setActiveTab(tab);
	// Radix unmounts inactive tab content, so the next step's target only
	// exists in the DOM after this repaint.
	requestAnimationFrame(() => advance(driver));
}

export function buildLabAuthoringTourSteps(
	setActiveTab: (tab: LabFormTab) => void,
): DriveStep[] {
	return [
		{
			popover: {
				title: "Let's build a lab",
				description:
					"A lab has three parts: basic details, a network topology, and step-by-step instructions with auto-graded checks. Let's walk through each.",
			},
		},
		{
			element: '[data-tour="lab-basic-fields"]',
			popover: {
				title: "Basic details",
				description:
					"Name the lab and set its schedule, session duration, and max attempts per student.",
				side: "bottom",
			},
		},
		{
			element: '[data-tour="lab-cover"]',
			popover: {
				title: "Cover image",
				description: "Shown on the lab card in the browse list.",
				side: "right",
			},
		},
		{
			element: '[data-tour="lab-attachments"]',
			popover: {
				title: "Attachments",
				description:
					"Upload material, references, or any other files related to this lab.",
				side: "top",
			},
		},
		{
			element: '[data-tour="lab-published-toggle"]',
			popover: {
				title: "Publish when ready",
				description:
					"A lab must be published before students can see or enroll in it.",
				side: "top",
				onNextClick: (_element, _step, { driver }) => {
					goToTab(setActiveTab, "topology", driver, (d) => d.moveNext());
				},
			},
		},
		{
			element: '[data-tour="device-palette"]',
			popover: {
				title: "Device palette",
				description: "Drag devices onto the canvas to build your topology.",
				side: "right",
				onPrevClick: (_element, _step, { driver }) => {
					goToTab(setActiveTab, "basic", driver, (d) => d.movePrevious());
				},
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
			element: '[data-tour="topology-template-actions"]',
			popover: {
				title: "Reusable topologies",
				description:
					"Save this topology as a template to reuse in other labs, or apply an existing template here.",
				side: "left",
				onNextClick: (_element, _step, { driver }) => {
					goToTab(setActiveTab, "instructions", driver, (d) => d.moveNext());
				},
			},
		},
		{
			element: '[data-tour="lab-instructions-editor"]',
			popover: {
				title: "Instructions",
				description:
					"Write the step-by-step guide students will follow during their session.",
				side: "top",
				onPrevClick: (_element, _step, { driver }) => {
					goToTab(setActiveTab, "topology", driver, (d) => d.movePrevious());
				},
			},
		},
		{
			element: '[data-tour="insert-lab-check"]',
			popover: {
				title: "Auto-graded checks",
				description:
					"Insert a check block tied to a specific device from your topology. Students' scores update live as they satisfy each check during their session.",
				side: "bottom",
			},
		},
		{
			popover: {
				title: "You're ready",
				description:
					"Save your lab whenever you're done. You can replay this tour anytime from the button next to the tabs.",
			},
		},
	];
}
