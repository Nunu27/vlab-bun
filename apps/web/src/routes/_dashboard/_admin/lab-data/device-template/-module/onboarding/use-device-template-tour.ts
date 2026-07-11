import { driver } from "driver.js";
import { useCallback, useEffect } from "react";
import { hasSeenTour, markTourSeen } from "./constants";
import { buildDeviceTemplateTourSteps } from "./tour-steps";

export function useDeviceTemplateTour() {
	const start = useCallback(() => {
		const tour = driver({
			showProgress: true,
			allowClose: true,
			steps: buildDeviceTemplateTourSteps(),
			onDestroyed: markTourSeen,
		});

		tour.drive();
	}, []);

	useEffect(() => {
		if (!hasSeenTour()) start();
	}, [start]);

	return { start };
}
