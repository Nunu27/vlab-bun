# @jawit/ws

A strictly typed WebSocket framework for TypeScript built on [Socket.IO](https://socket.io/) and [@sinclair/typebox](https://github.com/sinclairzx81/typebox).

It provides schema validation, path parameter extraction, type-safe replies, and horizontal scale-ready architecture without the boilerplate.

## Installation

```bash
bun add @jawit/ws socket.io @sinclair/typebox
```

## Usage

### 1. Define Contracts

Define your events, data schemas, and replies in a central contract.

```typescript
import { WSContracts } from "@jawit/ws";
import { Type } from "@sinclair/typebox";

export const wsContracts = new WSContracts()
	.register({
		event: "user:create",
		type: "client2server",
		data: Type.Object({ name: Type.String() }),
		meta: { requiresAuth: false }
	})
	.register({
		event: "chat:send:[roomId]",
		type: "inter", // both server & client can emit/subscribe
		data: Type.Object({ message: Type.String() }),
		replies: {
			ack: Type.Object({ received: Type.Boolean() })
		},
		meta: { requiresAuth: true }
	});
```

### 2. Server setup

Attach the `@jawit/ws` server adapter to your native Socket.IO server.

```typescript
import { SocketIOServer } from "@jawit/ws";
import { Server } from "socket.io";
import { wsContracts } from "./contracts";

export const wsServer = new SocketIOServer(wsContracts);

// Global middleware
wsServer.use((socket, meta) => {
	if (meta?.requiresAuth && !socket.data.session) {
		return false; 
	}
});

// Event handling
wsServer.on("chat:send:[roomId]", async ({ data, params, reply }) => {
	console.log(`Sending to room ${params.roomId}: ${data.message}`);
	reply("ack", { received: true });
});

// Stateless cleanup 
wsServer.onDispose("chat:send:[roomId]", (executionId) => {
	console.log(`Cleaned up chat execution: ${executionId}`);
});

// Attach to HTTP Server
const io = new Server(httpServer);
wsServer.attach(io);
```

### 3. Client setup

Use the client adapter to connect and communicate with full type safety.

```typescript
import { SocketIOClient } from "@jawit/ws";
import { io } from "socket.io-client";
import { wsContracts } from "./contracts";

const socket = io("http://localhost:3000");

export const wsClient = new SocketIOClient(wsContracts);
wsClient.attach(socket);

// Emit typesafe events
const cancelAction = wsClient.emit("chat:send:[roomId]", {
	data: { message: "Hello World" },
	params: { roomId: "123" },
	callbacks: {
		ack: (replyData) => {
			console.log("Ack received:", replyData.received);
		}
	}
});

// Cancel the event and tear down listeners
// cancelAction();

// Subscribe to events
const unsubscribe = wsClient.subscribe("chat:send:[roomId]", { roomId: "123" }, (payload) => {
	console.log("Incoming message:", payload.message);
});
```
