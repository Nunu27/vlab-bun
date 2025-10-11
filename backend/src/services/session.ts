import { Role } from "@/db/schema";
import env from "@/env";
import { Session } from "@/types/session";
import { failure } from "@/utils/response";
import { Elysia, t } from "elysia";
import redis from "./redis";

export default new Elysia()
	.guard({
		cookie: t.Object({
			session: t.Optional(t.String())
		})
	})
	.resolve(async ({ cookie: { session } }) => {
		if (!session.value) {
			session.value = Bun.randomUUIDv7();

			return {};
		} else {
			return {
				session: await redis.get<Session>(session.value)
			};
		}
	})
	.macro({
		guest: {
			beforeHandle({ session, status }) {
				if (!session) return;
				return status(400, failure({ message: "Already logged in" }));
			}
		},
		protected: {
			async beforeHandle({ cookie, session, status }) {
				if (!session) return status(401, failure({ message: "Unauthorized" }));
				await redis.expire(cookie.session.value!, env.SESSION_TTL);
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
				}
			};
		}
	})
	.as("global");
