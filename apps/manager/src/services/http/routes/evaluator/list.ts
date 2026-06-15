import { success } from "@jawit/common";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import evaluator from "@vlab/evaluator";

export default createRouter()
	.use(auth)
	.guard({ protected: true }, (app) => {
		return app.get("/list", () => success({ data: evaluator.getChecks() }));
	});
