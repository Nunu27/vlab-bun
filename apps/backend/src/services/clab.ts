import env from "@backend/env";
import type { paths } from "@backend/types/clab";
import type { LabConfig, Link, Node } from "@backend/types/containerlab";
import { toKebabCase } from "@backend/utils/string";
import { LABELS } from "@vlab/monitor/constants";
import createClient, {
	type FetchResponse,
	type Middleware
} from "openapi-fetch";
import type { MediaType } from "openapi-typescript-helpers";

const { CLAB_HOST, CLAB_USERNAME, CLAB_PASSWORD } = env;
let token: string | null = null;

const client = createClient<paths>({
	baseUrl: `http://${CLAB_HOST}:8080`
});

const getToken = async () => {
	const { data } = await client.POST("/login", {
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
>(func: () => Promise<FetchResponse<T, Options, Media>>) {
	const response = await func();

	if (response.response.status === 401) {
		token = await getToken();

		return await func();
	}

	return response;
}

client.use(authMiddleware);

export default {
	client,
	deploy: async (labName: string, config: LabConfig) => {
		const defaultLabels: Record<string, string> = {
			[LABELS.SESSION_ID]: config.sessionId,
			[LABELS.LAB_TYPE]: config.type,
			[LABELS.OWNER_ID]: config.ownerId
		};

		if (config.id) {
			defaultLabels[LABELS.LAB_ID] = config.id;
		}

		const nodeNames: Record<string, string> = {};
		const nodes: Record<string, Node> = Object.fromEntries(
			config.nodes.map(({ id, name, ports, resources, deviceId, ...rest }) => {
				const labels: Record<string, string> = {
					[LABELS.NODE_ID]: id
				};

				if (deviceId) {
					labels[LABELS.DEVICE_ID] = deviceId;
				}

				name = toKebabCase(name);
				nodeNames[id] = name;
				const node: Node = {
					...rest,
					ports: ports.map((port) => `0:${port}`),
					cpu: resources.cpu,
					memory: resources.memory,
					labels
				};

				return [name, node];
			})
		);

		const links = config.links?.map(
			(link) =>
				({
					endpoints: [
						`${nodeNames[link.sourceId]}:${link.sourceInterface}`,
						`${nodeNames[link.targetId]}:${link.targetInterface}`
					]
				}) satisfies Link
		);

		return await clabWrapper(() =>
			client.POST("/api/v1/labs", {
				body: {
					topologyContent: {
						name: labName,
						topology: {
							defaults: { labels: defaultLabels },
							nodes,
							links
						}
					}
				}
			})
		);
	},
	destroy: async (labName: string) => {
		return await clabWrapper(() =>
			client.DELETE(`/api/v1/labs/{labName}`, {
				params: {
					path: { labName },
					query: { cleanup: true }
				}
			})
		);
	}
};
