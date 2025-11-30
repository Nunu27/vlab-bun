import env from "@backend/env";
import { paths } from "@backend/types/clab";
import createClient, { FetchResponse, Middleware } from "openapi-fetch";
import { MediaType } from "openapi-typescript-helpers";

const { CLAB_HOST, CLAB_USERNAME, CLAB_PASSWORD } = env;
let token: string | null = null;

const clab = createClient<paths>({
	baseUrl: `http://${CLAB_HOST}:8080`
});

const getToken = async () => {
	const { data } = await clab.POST("/login", {
		body: { username: CLAB_USERNAME, password: CLAB_PASSWORD }
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
	}
};

export async function clabWrapper<
	T extends Record<string | number, any>,
	Options,
	Media extends MediaType
>(
	func: () => Promise<FetchResponse<T, Options, Media>>
): Promise<FetchResponse<T, Options, Media>> {
	const response = await func();

	if (response.response.status === 401) {
		token = await getToken();

		return await func();
	}

	return response;
}

clab.use(authMiddleware);

export default clab;
