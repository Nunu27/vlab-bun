import { createRouter } from "@manager/services/http/plugins/system";

import list from "./list";

const evaluatorRoutes = createRouter({
	prefix: "/evaluator",
	detail: { tags: ["Evaluator"] },
}).use(list);

export default evaluatorRoutes;
