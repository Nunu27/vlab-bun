import env from "@api/env";
import redis from "@api/services/redis";
import type { Role } from "@vlab/shared/enums";
import type { Session } from "@vlab/shared/types";
import Elysia, { t } from "elysia";

const PREFIX = "session";
const SESSION_PREFIX = `${PREFIX}:rest:`;
const DATA_PREFIX = `${PREFIX}:data:`;

const dataKey = (id: string) => DATA_PREFIX + id;

const getSession = async (id: string) => {
	const sessionKey = SESSION_PREFIX + id;
	let userId = await redis.get<string>(sessionKey);

	return {
		data: userId ? await redis.get<Session>(dataKey(userId)) : null,
		extend: async () => {
			if (!userId) return;

			await redis.expire(sessionKey, env.SESSION_TTL);
			await redis.expire(dataKey(userId), env.SESSION_TTL);
		},
		set: async (data: Session) => {
			userId = data.id;

			await redis.set(sessionKey, data.id, env.SESSION_TTL);
			await redis.set(dataKey(data.id), data, env.SESSION_TTL);
		},
		delete: async () => {
			if (!userId) return;

			userId = null;
			await redis.del(sessionKey);
		},
	};
};

export default new Elysia({ name: "auth" })
	.derive(() => ({
		session: undefined as Awaited<ReturnType<typeof getSession>> | undefined,
	}))
	.macro("auth", {
		cookie: t.Cookie({ session: t.Optional(t.String()) }),
		resolve: async ({ cookie: { session } }) => {
			session.value ??= Bun.randomUUIDv7();

			return { session: await getSession(session.value) };
		},
	})
	.macro("guest", {
		auth: true,
		beforeHandle: ({ session, status }) => {
			if (session.data) return status(400);
		},
		resolve: ({ session }) => ({ session: { ...session, data: null } }),
	})
	.macro("protected", {
		auth: true,
		beforeHandle: ({ session, status }) => {
			if (!session.data) return status(401);
		},
		resolve: ({ session }) => ({
			session: {
				...session,
				data: session.data as Session,
			},
		}),
	})
	.macro({
		private: (roles: Role[]) => ({
			protected: true,
			beforeHandle: ({ session, status }) => {
				const role = session?.data?.role;

				if (!role || !roles.includes(role)) return status(403);
			},
		}),
	})
	.as("scoped");
