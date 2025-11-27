import { deviceKindEnum } from "@backend/db/schema/lab-device";
import { t } from "elysia/type-system";

export const CreateDeviceRequest = t.Object({
	name: t.String({ minLength: 1 }),
	kind: t.UnionEnum(deviceKindEnum.enumValues),
	image: t.String({ minLength: 1 }),
	icon: t.File({ type: "image/*", maxSize: "10m" }),
	categoryId: t.String({ format: "uuid" }),
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
			code: t.String({ minLength: 1 }),
			name: t.String({ minLength: 1 })
		})
	)
});

export const UpdateDeviceRequest = t.Object({
	name: t.String({ minLength: 1 }),
	kind: t.UnionEnum(deviceKindEnum.enumValues),
	image: t.String({ minLength: 1 }),
	icon: t.Optional(t.File({ type: "image/*", maxSize: "10m" })),
	categoryId: t.String({ format: "uuid" }),
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
			code: t.String({ minLength: 1 }),
			name: t.String({ minLength: 1 })
		})
	)
});
