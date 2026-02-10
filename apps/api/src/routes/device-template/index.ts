import { createRouter } from "@api/plugins/system";
import ws from "@api/services/ws";
import create from "./create";
import _delete from "./delete";
import detail from "./detail";
import list from "./list";
import pagination from "./pagination";
import update from "./update";

ws.server.on("device-template:test", async () => {
	// if (!executionId) throw new Error("Execution ID not provided");
	// const nodeId = Bun.randomUUIDv7();
	// reply("info", `Pulling image ${data.image}...`);
	// await new Promise<void>((resolve, reject) => {
	// 	docker.pull(data.image, {}, (err, stream) => {
	// 		if (err || !stream) {
	// 			return reject(err ?? new Error("Image pull failed"));
	// 		}
	// 		docker.modem.followProgress(stream, (err) => {
	// 			if (err) return reject(err);
	// 			resolve();
	// 		});
	// 	});
	// });
	// reply("info", "Image pulled successfully.");
	// // Lab provisioning
	// reply("info", "Provisioning device...");
	// // const healthPromise = waitForEvent(
	// // 	tempNodeEvents,
	// // 	`${nodeId}:health`,
	// // 	{
	// // 		predicate: (health) => {
	// // 			if (!health) return null;
	// // 			else return health === "healthy" || undefined;
	// // 		},
	// // 		timeout: 120000,
	// // 	}
	// // );
	// // const portPromise = portEmitter.wait(
	// // 	nodeId,
	// // 	(ports) => ports || null,
	// // 	120000,
	// // 	null
	// // );
	// const originPorts = [
	// 	data.connection.data.port,
	// 	...getMonitorPorts(data.kind)
	// ];
	// // const { response } = await clab.deployLab(executionId, {
	// // 	ownerId: session.id,
	// // 	nodes: [
	// // 		{
	// // 			id: nodeId,
	// // 			name: data.name,
	// // 			image: data.image,
	// // 			kind: data.kind,
	// // 			env: data.env,
	// // 			ports: originPorts,
	// // 			resources: data.resources
	// // 		}
	// // 	]
	// // });
	// // if (!response.ok) {
	// // 	throw new Error("Error during device provisioning");
	// // }
	// reply("info", "Device provisioned.");
	// // Health check
	// reply("info", "Waiting for device to become healthy...");
	// // const isHealthy = await healthPromise;
	// // if (isHealthy) {
	// // 	reply("info", "Device is healthy.");
	// // } else if (isHealthy === null) {
	// // 	reply("warn", "Device does not have health check configured.");
	// // 	await sleep(2500);
	// // } else {
	// // 	reply("warn", "Device did not become healthy in time.");
	// // }
	// // const ports = await portPromise;
	// // if (!ports) {
	// // 	throw new Error("Failed to retrieve device port mapping.");
	// // }
	// // Access token generation
	// reply("info", "Generating access token...");
	// // const token = guacamole.generateToken({
	// // 	type: data.connection.type,
	// // 	settings: {
	// // 		hostname: env.CLAB_HOST,
	// // 		port: ports[data.connection.data.port].toString(),
	// // 		username: data.connection.data.username,
	// // 		password: data.connection.data.password
	// // 	}
	// // });
	// reply("info", "Access token generated.");
	// // reply("token", token);
});

const deviceTemplateRoutes = createRouter({
	prefix: "/device-template",
	detail: { tags: ["Device Template"] },
})
	.use(create)
	.use(detail)
	.use(update)
	.use(_delete)
	.use(list)
	.use(pagination);

export default deviceTemplateRoutes;
