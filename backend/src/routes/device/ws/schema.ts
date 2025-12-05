import { deviceKindEnum } from "@backend/db/schema/lab-device";
import { createWSSchema } from "@backend/utils/ws";
import { t } from "elysia/type-system";

const deviceWSSchemas = [
	createWSSchema({
		type: "client2server",
		name: "device/test",
		private: ["admin"],
		reply: {
			message: t.String(),
			token: t.String()
		},
		data: t.Object({
			name: t.String({ minLength: 1 }),
			kind: t.UnionEnum(deviceKindEnum.enumValues),
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
					code: t.String({ minLength: 1 }),
					name: t.String({ minLength: 1 })
				})
			)
		})
	})
];

export default deviceWSSchemas;
