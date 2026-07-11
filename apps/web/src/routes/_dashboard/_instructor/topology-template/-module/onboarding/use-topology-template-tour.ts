import { driver } from "driver.js";
import { useCallback, useEffect } from "react";
import { hasSeenTour, markTourSeen } from "./constants";
import { buildTopologyTemplateTourSteps } from "./tour-steps";

export function useTopologyTemplateTour() {
	const start = useCallback(() => {
		const tour = driver({
			showProgress: true,
			allowClose: true,
			steps: buildTopologyTemplateTourSteps(),
			onDestroyed: markTourSeen,
		});

		tour.drive();
	}, []);

	useEffect(() => {
		if (!hasSeenTour()) start();
	}, [start]);

	return { start };
}
