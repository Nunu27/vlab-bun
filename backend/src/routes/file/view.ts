import { createRouter } from "@backend/plugins/services";

export default createRouter().get(
	"/:name",
	async ({ session, params, storage, bucket, set, status }) => {
		if (!session) return status(401);

		let response = await storage.getObjectResponse(params.name);
		if (!response) return status(404);

		return response;
	},
	{
		protected: false,
		detail: {
			description: "Get a file"
		}
	}
);
