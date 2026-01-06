import env from "@backend/env";
import { childLogger } from "@backend/services/logger";
import { createDBListener } from "@vlab/db-listener";
import db from ".";

const dbListener = createDBListener(db, {
	batchSize: env.BATCH_SIZE,
	logger: childLogger("db-listener"),
	debounceMs: env.DEBOUNCE_MS,
	maxBatchWaitMs: env.MAX_BATCH_WAIT_MS
});

export default dbListener;
