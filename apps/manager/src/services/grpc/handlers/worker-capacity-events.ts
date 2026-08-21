import EventEmitter from "node:events";
import env from "@manager/env";
import baseLogger from "@manager/lib/logger";
import redis from "@manager/lib/redis";
import type { TypedEventEmitter } from "@manager/types/events";
import { decode, encode } from "@msgpack/msgpack";

const logger = baseLogger.child({ service: "worker-capacity" });

export const capacityChannel = "vlab:worker-capacity";

type CapacityEvents = {
	freed: [workerId: string];
};

const emitter = new EventEmitter();
// One listener per queued lab, and a full classroom queues far more than the
// default cap of 10. They are not a leak, so drop the warning threshold.
emitter.setMaxListeners(0);

/**
 * Fires whenever a worker gains admission headroom. Waiters in
 * `waitForAvailableWorkerId` retry off this rather than a timer, so a queued lab
 * starts the moment a slot opens instead of on the next tick of a poll.
 */
export const capacityEvents: TypedEventEmitter<CapacityEvents> = emitter;

type CapacityMessage = {
	managerId: string;
	workerId: string;
};

/**
 * Announce that `workerId` has room it did not have a moment ago. Call this
 * after *releasing* a reservation, never after taking one.
 *
 * Waiters may sit on any manager in the cluster, so the signal goes out over
 * Redis as well as to this process. Delivery is best-effort by design: pub/sub
 * has no durability, and a dropped message only costs a waiter the wait it was
 * already prepared for.
 */
export function publishCapacityFreed(workerId: string) {
	capacityEvents.emit("freed", workerId);

	const message: CapacityMessage = { managerId: env.MANAGER_ID, workerId };

	redis.client
		.publish(capacityChannel, Buffer.from(encode(message)))
		.catch((err) =>
			logger.warn(
				{ err, workerId },
				"Failed to broadcast freed worker capacity to other managers",
			),
		);
}

export function handleCapacityMessage(messageBuffer: Buffer) {
	const { managerId, workerId } = decode(messageBuffer) as CapacityMessage;
	// publishCapacityFreed already emitted this locally.
	if (managerId === env.MANAGER_ID) return;

	capacityEvents.emit("freed", workerId);
}
