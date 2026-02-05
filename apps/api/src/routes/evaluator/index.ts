// TODO: Evaluator list endpoint
// The old backend uses `@vlab/evaluator` (a custom monorepo package) to list
// available evaluator systems and their check definitions.
// This endpoint is skipped until `@vlab/evaluator` is available in this workspace.
// Expected route: GET /evaluator → returns evaluator systems grouped by name
//   with their kinds and available checks (title, paramsSchema).

import { createRouter } from "@api/plugins/system";

const evaluatorRoutes = createRouter({
	prefix: "/evaluator",
	detail: { tags: ["Evaluator"] },
});

export default evaluatorRoutes;
