import { Role } from "@/db/schema/auth";
import env from "@/env";
import redis from "@/services/redis";
import { Session } from "@/types/session";
import { failure } from "@/utils/response";
import { Elysia, t } from "elysia";

export default new Elysia({ name: "session" })
	.guard({
		cookie: t.Object({
			session: t.Optional(t.String())
		})
	})
	.resolve(async ({ cookie: { session } }) => {
		session.value ??= Bun.randomUUIDv7();

		return {
			sessionId: session.value,
			session: await redis.get<Session>(session.value)
		};
	})
	.macro({
		guest: {
			beforeHandle({ session, status }) {
				if (!session) return;
				return status(400, failure({ message: "Already logged in" }));
			},
			resolve() {
				return { session: null };
			}
		},
		protected: {
			async beforeHandle({ cookie: { session }, status }) {
				if (session.value) await redis.expire(session.value, env.SESSION_TTL);
				else return status(401, failure({ message: "Unauthorized" }));
			},
			resolve({ session }) {
				return { session: session! };
			}
		},
		private(roles: Role[]) {
			return {
				async beforeHandle({ cookie, session, status }) {
					if (session && roles.includes(session.role)) {
						await redis.expire(cookie.session.value!, env.SESSION_TTL);
						return;
					}

					return status(403, failure({ message: "Forbidden" }));
				},
				resolve({ session }) {
					return { session: session! };
				}
			};
		}
	})
	.as("global");
