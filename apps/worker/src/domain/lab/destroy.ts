import { stopLabEvaluation } from "@worker/domain/evaluation";
import clab from "@worker/lib/clab";

const destroyingSessions = new Map<string, Promise<unknown>>();

export async function destroyLab(sessionId: string) {
	const inFlight = destroyingSessions.get(sessionId);
	if (inFlight) return inFlight;

	const promise = (async () => {
		try {
			await stopLabEvaluation(sessionId, { immediate: true });
			await clab.destroy(sessionId);
		} finally {
			destroyingSessions.delete(sessionId);
		}
	})();

	destroyingSessions.set(sessionId, promise);
	return promise;
}
