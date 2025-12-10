import { Type } from "typebox";
import type {
	Evaluator,
	TriggerHandler,
	Condition,
	LinuxContext
} from "../../types";

const ipAddrTrigger: TriggerHandler<LinuxContext> = async (ctx, callback) => {
	try {
		const output = await ctx.exec("ip -j addr");
		const data = JSON.parse(output);
		await callback(data);
	} catch (e) {
		console.error("Failed to execute or parse ip -j addr", e);
		// Fallback or rethrow? For now, let's assume failure to get data is a failure.
		throw e;
	}
};

const checkInterfaceIpSchema = Type.Object({
	interface: Type.String(),
	ip: Type.String()
});

const checkInterfaceIp: Condition<typeof checkInterfaceIpSchema> = {
	name: "check_interface_ip",
	triggerId: "ip_address",
	schema: checkInterfaceIpSchema,
	handler: (data: any[], params) => {
		if (!Array.isArray(data)) return false;

		const iface = data.find((i: any) => i.ifname === params.interface);
		if (!iface || !iface.addr_info) return false;

		const addr = iface.addr_info.find((a: any) => {
			const cidr = `${a.local}/${a.prefixlen}`;
			if (params.ip.includes("/")) {
				return cidr === params.ip;
			}
			return a.local === params.ip;
		});

		return !!addr;
	}
};

export const LinuxEvaluator: Evaluator<LinuxContext> = {
	triggers: {
		ip_address: ipAddrTrigger
	},
	conditions: {
		check_interface_ip: checkInterfaceIp
	}
};
