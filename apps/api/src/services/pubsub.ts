import { RedisPublisher, RedisSubscriber } from "@jawit/redis-pubsub";
import Redis from "ioredis";
import env from "../env";

interface PubSubEvents {
	tes: string;
	a: { tes: number };
}

export const redisPub = new RedisPublisher<PubSubEvents>(
	new Redis(env.REDIS_URL),
);
export const redisSub = new RedisSubscriber<PubSubEvents>(
	new Redis(env.REDIS_URL),
);
