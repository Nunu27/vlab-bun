import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import env from "../env";

const db = drizzle(env.DATABASE_URL, { schema });
const client = await db.$client.connect();
const listeners = new Map<string, ((payload: any) => Promise<void>)[]>();

// client.on("notification", async ({ channel, payload }) => {
// 	// chunk listeners based on batch size, and run it concurrently
// 	const channelListeners = listeners.get(channel) || [];

// 	for (let i = 0; i < channelListeners.length; i += env.BATCH_SIZE) {
// 		const chunk = channelListeners.slice(i, i + env.BATCH_SIZE);

// 		for (const result of await Promise.allSettled(
// 			chunk.map((listener) => listener(JSON.parse(payload!)))
// 		)) {
// 		}
// 	}
// });

export default db;
