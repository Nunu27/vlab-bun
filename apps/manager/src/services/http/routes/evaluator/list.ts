import { success } from "@jawit/common";
import caching from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import evaluator from "@vlab/evaluator";

export default createRouter()
	.use(caching)
	.get("/list", () => success({ data: evaluator.getChecks() }), {
		cached: { key: "evaluator:list" },
		protected: true,
	});
