export const ONBOARDING_STORAGE_KEY = "vlab:onboarding:device-template:v1";

export function hasSeenTour() {
	return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1";
}

export function markTourSeen() {
	localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
}
