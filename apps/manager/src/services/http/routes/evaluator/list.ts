import { success } from "@jawit/common";
import caching from "@manager/services/http/middlewares/caching";
import { createRouter } from "@manager/services/http/plugins/system";
import evaluator from "@vlab/evaluator";

export default createRouter()
	.use(caching)
	.guard({ cached: true, protected: true }, (app) => {
		return app
			.resolve(({ entity: { key }, cache }) => cache.set(`${key}:list`))
			.get("/list", () => success({ data: evaluator.getChecks() }));
	});
