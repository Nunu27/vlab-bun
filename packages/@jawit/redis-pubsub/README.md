# @jawit/redis-pubsub

A lightweight, strongly-typed Redis Pub/Sub wrapper using `ioredis` and `@msgpack/msgpack` to seamlessly serialize and deserialize payloads.

It creates safe boundaries around Redis event channels, giving you proper auto-completion and data inference when emitting and listening for cross-service messages.

## Installation

```bash
bun add @jawit/redis-pubsub ioredis @msgpack/msgpack
```

## Usage

### 1. Define Message Map

Define a single type representing all your pub/sub channels and the data payloads they expect.

```typescript
// types.ts
export interface MyEventMap {
	"user:registered": { userId: string; email: string };
	"notification:sent": { id: string; success: boolean };
};
```

### 2. Setting up the Publisher

Pass an active `ioredis` instance and your type map into `RedisPublisher`.

```typescript
// publisher.ts
import Redis from "ioredis";
import { RedisPublisher } from "@jawit/redis-pubsub";
import type { MyEventMap } from "./types";

const redisClient = new Redis(process.env.REDIS_URL);
export const publisher = new RedisPublisher<MyEventMap>(redisClient);

// Emitting is now fully type-safe! Objects are serialized with MessagePack automatically.
await publisher.emit("user:registered", { 
	userId: "123", 
	email: "user@example.com" 
});
```

### 3. Setting up the Subscriber

The subscriber works dynamically. When you attach a listener to an event string, it will subscribe to the Redis channel.

```typescript
// subscriber.ts
import Redis from "ioredis";
import { RedisSubscriber } from "@jawit/redis-pubsub";
import type { MyEventMap } from "./types";

const redisClient = new Redis(process.env.REDIS_URL);
export const subscriber = new RedisSubscriber<MyEventMap>(redisClient);

const userHandler = (data: { userId: string; email: string }) => {
	console.log("New user registered:", data.email);
};

// Start listening
await subscriber.on("user:registered", userHandler);

// Stop listening
// await subscriber.off("user:registered", userHandler);
```

### Best Practices
Since `RedisSubscriber` handles native subscription blocks heavily behind the scenes, you **must pass a dedicated Redis connection to the subscriber**. Reusing a Redis client for both publishing and subscribing is generally not standard practice and will lock the instance into subscriber-only mode.
