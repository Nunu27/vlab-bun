import type { FetchResponse, Middleware } from "openapi-fetch";
import createClient from "openapi-fetch";
import type { MediaType } from "openapi-typescript-helpers";
import type { paths } from "./clab";

export function createCLABClient({
	host,
	username,
	password,
}: {
	host: string;
	username: string;
	password: string;
}) {
	let token: string | undefined;
	const client = createClient<paths>({
		baseUrl: `http://${host}:8080`,
	});

	const getToken = async () => {
		const { data } = await client.POST("/login", {
			body: { username, password },
		});

		if (!data?.token) throw new Error("Failed to get token from CLAB");

		return data.token;
	};

	const authMiddleware: Middleware = {
		async onRequest({ request }) {
			if (request.url.endsWith("/login")) return request;

			token ??= await getToken();
			request.headers.set("Authorization", `Bearer ${token}`);

			return request;
		},
	};

	client.use(authMiddleware);

	return {
		client,
		wrapper: async <
			// biome-ignore lint/suspicious/noExplicitAny: generic type
			T extends Record<string | number, any>,
			Options,
			Media extends MediaType,
		>(
			func: () => Promise<FetchResponse<T, Options, Media>>,
		) => {
			const response = await func();

			if (response.response.status === 401) {
				token = await getToken();

				return await func();
			}

			return response;
		},
	};
}
