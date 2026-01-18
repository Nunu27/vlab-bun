import type { Role } from "@backend/db/schema/auth";
import env from "@backend/env";
import redis from "@backend/services/redis";
import { failure } from "@backend/utils/response";
import type { Session } from "@vlab/shared/types";
import { ToastItemSchema } from "@vlab/shared/types";
import { Elysia, t } from "elysia";

export const deleteSession = async (userId: string) => {
	await redis.del(`session:data:${userId}`);
};

export const getSession = async (id: string) => {
	const key = `session:rest:${id}`;
	let userId = await redis.get<string>(key);

	return {
		data: await redis.get<Session>(`session:data:${userId}`),
		extend: async () => {
			if (!userId) return;

			await redis.expire(key, env.SESSION_TTL);
			if (userId) {
				await redis.expire(`session:data:${userId}`, env.SESSION_TTL);
			}
		},
		set: async (data: Session) => {
			userId = data.id;
			await redis.set(key, data.id, env.SESSION_TTL);
			await redis.set(`session:data:${data.id}`, data, env.SESSION_TTL);
		},
		delete: async () => {
			if (!userId) return;

			userId = null;
			await redis.del(key);
		}
	};
};

export default new Elysia({ name: "session" })
	.guard({
		cookie: t.Object({
			toast: t.Optional(ToastItemSchema),
			session: t.Optional(t.String())
		})
	})
	.resolve(async ({ cookie: { session } }) => {
		session.value ??= Bun.randomUUIDv7();

		return {
			session: await getSession(session.value)
		};
	})
	.as("global")
	.macro({
		guest: {
			beforeHandle({ session, status }) {
				if (!session.data) return;
				return status(400, failure({ message: "Already logged in" }));
			}
		},
		protected: {
			async beforeHandle({ session, status }) {
				if (session.data) await session.extend();
				else return status(401, failure({ message: "Unauthorized" }));
			},
			resolve: ({ session }) => ({
				session: {
					...session,
					data: session.data!
				}
			})
		},
		private(roles: Role[]) {
			return {
				async beforeHandle({ session, status }) {
					if (!session.data) status(401, failure({ message: "Unauthorized" }));
					else if (roles.includes(session.data.role)) await session.extend();
					else return status(403, failure({ message: "Forbidden" }));
				},
				resolve: ({ session }) => ({
					session: {
						...session,
						data: session.data!
					}
				})
			};
		}
	});
