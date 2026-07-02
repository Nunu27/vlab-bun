import {
	cleanupDeviceTest,
	testDeviceOnWorker,
} from "@manager/domain/device-template/test";
import {
	startEvaluation,
	stopEvaluation,
} from "@manager/domain/lab-session/evaluation";
import { initSession } from "@manager/domain/lab-session/init";
import { labSessionQueue } from "@manager/services/queue";
import { sendCommandToWorker } from "./worker";

async function destroySessionOnWorker(
	workerId: string,
	payload: { sessionId: string },
) {
	await sendCommandToWorker(workerId, "clab:destroyLab", {
		sessionId: payload.sessionId,
	});
	await labSessionQueue.remove(payload.sessionId);
}

export const actionHandlers = {
	"lab:initSession": initSession,
	"lab:destroy": destroySessionOnWorker,
	"evaluator:start": startEvaluation,
	"evaluator:stop": stopEvaluation,
	"device:testInit": testDeviceOnWorker,
	"device:testCleanup": cleanupDeviceTest,
};

export type ActionName = keyof typeof actionHandlers;
export type ActionPayload<K extends ActionName> = Parameters<
	(typeof actionHandlers)[K]
>[1];
