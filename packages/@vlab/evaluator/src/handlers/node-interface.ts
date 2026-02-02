import { Type as t } from "@sinclair/typebox";
import { EvaluationHandler } from "../base/evaluation-handler";

export default new EvaluationHandler("node-interface")
	.addSource("interface-ip", {
		params: { interface: t.String() },
		data: t.String(),
	})
	.addCheck("check-ip", {
		name: "Interface IP",
		source: "interface-ip",
		params: {
			interface: t.String({
				title: "Interface",
			}),
			ip: t.String({
				title: "IP Address",
			}),
		},
		sourceParamsBuilder: ({ params }) => ({ interface: params.interface }),
		handler: ({ params, data }) => {
			return params.ip === data;
		},
	});
