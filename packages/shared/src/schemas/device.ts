import { t } from "elysia/type-system";
import { deviceKindEnum } from "../enums";
import { createWSSchema } from "../types/ws";
import { Stringified } from "../utils";

export const CreateDeviceRequest = t.Object({
	name: t.String({ minLength: 1 }),
	kind: t.UnionEnum(deviceKindEnum),
	image: t.String({ minLength: 1 }),
	icon: t.File({ type: "image/*", maxSize: "10m" }),
	categoryId: t.String({ format: "uuid" }),
	env: Stringified(t.Record(t.String(), t.String())),
	resources: t.ObjectString({
		cpu: t.Optional(t.Number()),
		memory: t.Optional(t.String())
	}),
	connection: t.ObjectString({
		type: t.UnionEnum(["rdp", "vnc", "ssh", "telnet"]),
		data: t.Object({
			port: t.Number(),
			username: t.Optional(t.String({ minLength: 1 })),
			password: t.Optional(t.String({ minLength: 1 }))
		})
	}),
	interfaces: t.ArrayString(
		t.Object({
			internalCode: t.String({ minLength: 1 }),
			displayedCode: t.String({ minLength: 1 }),
			name: t.String({ minLength: 1 }),
			configurable: t.Boolean()
		})
	)
});

export const UpdateDeviceRequest = t.Object({
	name: t.String({ minLength: 1 }),
	kind: t.UnionEnum(deviceKindEnum),
	image: t.String({ minLength: 1 }),
	icon: t.Optional(t.File({ type: "image/*", maxSize: "10m" })),
	categoryId: t.String({ format: "uuid" }),
	env: Stringified(t.Record(t.String(), t.String())),
	resources: t.ObjectString({
		cpu: t.Optional(t.Number()),
		memory: t.Optional(t.String())
	}),
	connection: t.ObjectString({
		type: t.UnionEnum(["rdp", "vnc", "ssh", "telnet"]),
		data: t.Object({
			port: t.Number(),
			username: t.Optional(t.String({ minLength: 1 })),
			password: t.Optional(t.String({ minLength: 1 }))
		})
	}),
	interfaces: t.ArrayString(
		t.Object({
			internalCode: t.String({ minLength: 1 }),
			displayedCode: t.String({ minLength: 1 }),
			name: t.String({ minLength: 1 }),
			configurable: t.Boolean()
		})
	)
});

export const DeviceTestRequest = t.Object({
	name: t.String({ minLength: 1 }),
	kind: t.UnionEnum(deviceKindEnum),
	image: t.String({ minLength: 1 }),
	env: t.Record(t.String(), t.String()),
	resources: t.Object({
		cpu: t.Optional(t.Number()),
		memory: t.Optional(t.String())
	}),
	connection: t.Object({
		type: t.UnionEnum(["rdp", "vnc", "ssh", "telnet"]),
		data: t.Object({
			port: t.Number(),
			username: t.Optional(t.String({ minLength: 1 })),
			password: t.Optional(t.String({ minLength: 1 }))
		})
	}),
	interfaces: t.Array(
		t.Object({
			internalCode: t.String({ minLength: 1 }),
			displayedCode: t.String({ minLength: 1 }),
			name: t.String({ minLength: 1 }),
			configurable: t.Boolean()
		})
	)
});

// WS
export const deviceWSSchemas = [
	createWSSchema({
		type: "client2server",
		name: "device/test",
		private: ["admin"],
		reply: {
			message: t.String(),
			warn: t.String(),
			token: t.String()
		},
		data: DeviceTestRequest
	})
] as const;
