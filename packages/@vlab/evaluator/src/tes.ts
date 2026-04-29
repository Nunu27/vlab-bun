import { RouterOSClient } from "mikro-routeros";

async function main() {
	// Optional: Set custom timeout (30 seconds) - default is 30000ms
	const client = new RouterOSClient("172.31.20.5");
	await client.connect();
	await client.login("admin", "admin");

	// const stream = await client.stream("/routing/ospf/area/print", {
	// 	follow: true,
	// });

	// stream.on("data", (data) => {
	// 	console.log(data);
	// });

	console.log(await client.runQuery("/routing/bgp/instance/print"));
}

main().catch(console.error);
// [
//   {
//     ".id": "*1",
//     name: "backbone1",
//     instance: "inst1",
//     "area-id": "0.0.0.0",
//     type: "default",
//     inactive: "false",
//   }
// ]
// {
//   ".id": "*3",
//   name: "backbone2",
//   instance: "inst1",
//   "area-id": "1.1.1.1",
//   type: "default",
//   inactive: "false",
// }
// {
//   ".id": "*3",
//   ".dead": "true",
// }
