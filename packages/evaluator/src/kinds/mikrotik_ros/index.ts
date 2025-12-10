// import { Type } from "typebox";
// import type {
// 	Evaluator,
// 	TriggerHandler,
// 	Condition,
// 	MikrotikContext
// } from "../../types";

// const ipAddrTrigger: TriggerHandler<MikrotikContext> = async (
// 	ctx,
// 	callback
// ) => {
// 	try {
// 		const data = await ctx.client.api().menu("/ip/address").get();
// 		await callback(data);
// 	} catch (e) {
// 		console.error("Failed to execute /ip/address print", e);
// 		throw e;
// 	}
// };

// const checkInterfaceIpSchema = Type.Object({
// 	interface: Type.String(),
// 	ip: Type.String()
// });

// const checkInterfaceIp: Condition<typeof checkInterfaceIpSchema> = {
// 	name: "check_interface_ip",
// 	triggerId: "ip_address",
// 	schema: checkInterfaceIpSchema,
// 	handler: (data: any[], params) => {
// 		if (!Array.isArray(data)) return false;

// 		const iface = data.find((i: any) => i.interface === params.interface);
// 		if (!iface || !iface.address) return false;

// 		const currentIp = iface.address;

// 		if (params.ip.includes("/")) {
// 			return currentIp === params.ip;
// 		} else {
// 			const ipOnly = currentIp.split("/")[0];
// 			return ipOnly === params.ip;
// 		}
// 	}
// };

// export const MikrotikRosEvaluator: Evaluator<MikrotikContext> = {
// 	triggers: {
// 		ip_address: ipAddrTrigger
// 	},
// 	conditions: {
// 		check_interface_ip: checkInterfaceIp
// 	}
// };
