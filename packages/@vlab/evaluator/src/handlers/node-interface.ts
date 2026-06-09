import { Type as t } from "@sinclair/typebox";
import { EvaluationHandler } from "../base/evaluation-handler";

export default new EvaluationHandler("node-interface")
	.addSource({
		id: "interfaces-ip",
		data: t.Record(t.String(), t.Array(t.String())),
		listen: ({ node }, notify) => {
			console.log(node);
			notify({ eth0: ["192.168.1.35"] });

			return () => {};
		},
		read: async () => {
			return { eth0: ["192.168.1.35"] };
		},
	})
	.addCheck({
		id: "check-ip",
		name: "Interface IP",
		text: "{interface} should have IP address {ip}",
		source: "interfaces-ip",
		params: {
			interface: t.String({
				title: "Interface",
			}),
			ip: t.String({
				title: "IP Address",
			}),
		},
		handler: (_, params, data) => {
			return data[params.interface]?.includes(params.ip) ?? false;
		},
	});
