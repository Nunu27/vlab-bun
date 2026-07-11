import { driver } from "driver.js";
import { useCallback } from "react";
import { markTourSeen } from "./constants";
import { buildTourSteps } from "./tour-steps";

export function useLabSessionTour() {
	const start = useCallback(() => {
		const tour = driver({
			showProgress: true,
			allowClose: true,
			steps: buildTourSteps(),
			onDestroyed: markTourSeen,
		});

		tour.drive();
	}, []);

	return { start };
}
