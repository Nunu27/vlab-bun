import { driver } from "driver.js";
import { useCallback, useEffect, useState } from "react";
import { hasSeenTour, markTourSeen } from "./constants";
import { buildLabAuthoringTourSteps, type LabFormTab } from "./tour-steps";

export function useLabAuthoringTour() {
	const [activeTab, setActiveTab] = useState<LabFormTab>("basic");

	const start = useCallback(() => {
		const tour = driver({
			showProgress: true,
			allowClose: true,
			steps: buildLabAuthoringTourSteps(setActiveTab),
			onDestroyed: markTourSeen,
		});

		tour.drive();
	}, []);

	useEffect(() => {
		if (!hasSeenTour()) start();
	}, [start]);

	return { activeTab, setActiveTab, start };
}
