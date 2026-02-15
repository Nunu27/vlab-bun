import caching from "@api/middlewares/caching";
import { createRouter } from "@api/plugins/system";
import { success } from "@jawit/common";
import evaluator from "@vlab/evaluator";

export default createRouter()
	.use(caching)
	.guard({ cached: true, protected: true }, (app) => {
		return app
			.resolve(({ entity: { key } }) => ({ cacheKey: `${key}:list` }))
			.get("/list", () => success({ data: evaluator.getRegisteredChecks() }));
	});
