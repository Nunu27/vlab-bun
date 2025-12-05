import type { Role } from "@backend/db/schema/auth";
import env from "@backend/env";
import redis from "@backend/services/redis";
import type { Session } from "@backend/types/session";
import { ToastItemSchema } from "@backend/types/toast";
import { failure } from "@backend/utils/response";
import { Elysia, t } from "elysia";

export const getSession = async (id: string) => {
	const key = `session:${id}`;

	return {
		data: await redis.get<Session>(key),
		extend: async () => {
			await redis.expire(key, env.SESSION_TTL);
		},
		set: async (data: Session) => {
			await redis.set(key, data, env.SESSION_TTL);
		},
		delete: async () => {
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
