import { Elysia, t } from "elysia";
import { Role } from "../db/schema";
import redis from "./redis";
import { Session } from "../types/session";
import { failure } from "../utils/response";

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
			beforeHandle({ session, status }) {
				if (session) return;
				return status(401, failure({ message: "Unauthorized" }));
			}
		},
		private(...roles: Role[]) {
			return {
				beforeHandle({ session, status }) {
					if (session && roles.includes(session.role)) return;
					return status(403, failure({ message: "Forbidden" }));
				}
			};
		}
	})
	.as("global");
