import { createWSEvent } from "@backend/plugins/ws";
import { TestDeviceRequest, TestDeviceResponse } from "./schema";

export default [
	createWSEvent({
		type: "client2server",
		name: "device/test/request",
		body: TestDeviceRequest,
		private: ["admin"],
		handler: async ({ ws, body }) => {
			const id = Bun.randomUUIDv7();
		}
	}),
	createWSEvent({
		type: "server2client",
		name: "device/test/:id",
		body: TestDeviceResponse,
		private: ["admin"]
	})
];
