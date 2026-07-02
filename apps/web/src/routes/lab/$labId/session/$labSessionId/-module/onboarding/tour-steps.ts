import { TOPOLOGY_ID } from "@web/shared/topology/constants";
import type { DriveStep } from "driver.js";

export function buildTourSteps(): DriveStep[] {
	const steps: DriveStep[] = [
		{
			popover: {
				title: "Welcome to your lab session",
				description:
					"This is your hands-on workspace. Let's take a quick tour of the essentials.",
			},
		},
		{
			element: "#topology-canvas",
			popover: {
				title: "Your network topology",
				description:
					"This is the network you'll be working with. Drag to pan, scroll to zoom.",
				side: "top",
			},
		},
	];

	const firstNode = document.querySelector(
		`#${TOPOLOGY_ID.DEVICE_LAYER} .node`,
	);
	if (firstNode) {
		steps.push(
			{
				element: firstNode,
				popover: {
					title: "Access a device",
					description: "Double-click a device to open its console.",
					side: "bottom",
				},
			},
			{
				element: firstNode,
				popover: {
					title: "Device status",
					description:
						"The corner dot shows its status.\nYellow: starting up\nGreen: healthy\nRed: needs attention: submit and start a new session; contact an admin if it persists",
					side: "bottom",
				},
			},
		);
	}

	steps.push(
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
			element: '[data-tour="toggle-instructions"]',
			popover: {
				title: "Show or hide instructions",
				description:
					"Toggle this panel any time to bring the instructions back.",
				side: "left",
			},
		},
		{
			element: '[data-tour="instructions-panel"]',
			popover: {
				title: "Lab instructions",
				description: "This panel has the guide to follow for this lab.",
				side: "left",
			},
		},
		{
			element: '[data-tour="instructions-panel"]',
			popover: {
				title: "Lab attachments",
				description: "Any downloadable files for the lab appear at the top.",
				side: "left",
			},
		},
		{
			element: '[data-tour="instructions-panel"]',
			popover: {
				title: "Track your progress",
				description:
					"Checklist badges update automatically as you complete tasks. Hover one to see the details.",
				side: "left",
			},
		},
		{
			element: '[data-tour="score-indicator"]',
			popover: {
				title: "Your score",
				description: "This updates live as you complete lab checks.",
				side: "bottom",
			},
		},
		{
			element: '[data-tour="session-timer"]',
			popover: {
				title: "Time remaining",
				description:
					"Keep an eye on the countdown. It turns red under 5 minutes.",
				side: "bottom",
			},
		},
		{
			element: '[data-tour="submit-button"]',
			popover: {
				title: "Submit when ready",
				description:
					"Submit your session for grading whenever you're done, any time before the deadline.",
				side: "bottom",
			},
		},
	);

	return steps;
}
