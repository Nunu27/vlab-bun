/** biome-ignore-all lint/suspicious/noExplicitAny: generic type */
import { EventEmitter } from "node:events";
import { decode, encode } from "@msgpack/msgpack";
import type Redis from "ioredis";

export class RedisPublisher<
	TEventMap extends Record<string, any> = Record<string, unknown>,
> {
	constructor(private redis: Redis) {}

	async emit<TEventName extends keyof TEventMap & string>(
		event: TEventName,
		data: TEventMap[TEventName],
	) {
		await this.redis.publish(event, Buffer.from(encode(data)));
	}
}

type EmitterEventMap<T> = {
	[K in keyof T & string]: [T[K]];
};

export class RedisSubscriber<
	TEventMap extends Record<string, any> = Record<string, unknown>,
> {
	private emitter = new EventEmitter<EmitterEventMap<TEventMap>>();

	constructor(private redis: Redis) {
		redis.on("messageBuffer", (channelBuffer, messageBuffer) => {
			const channel = channelBuffer.toString();
			(this.emitter as any).emit(channel, decode(messageBuffer));
		});
	}

	async on<TEventName extends keyof TEventMap & string>(
		event: TEventName,
		listener: (data: TEventMap[TEventName]) => void | Promise<void>,
	) {
		this.emitter.on(event, listener as any);

		if (this.emitter.listenerCount(event) === 1) {
			await this.redis.subscribe(event);
		}
	}

	async off<TEventName extends keyof TEventMap & string>(
		event: TEventName,
		listener: (data: TEventMap[TEventName]) => void | Promise<void>,
	) {
		this.emitter.off(event, listener as any);

		if (this.emitter.listenerCount(event) === 0) {
			await this.redis.unsubscribe(event);
		}
	}
}
