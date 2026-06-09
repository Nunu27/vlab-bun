import storage from "@manager/lib/storage";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";

const HEADERS = ["content-type", "last-modified", "etag"];

export default createRouter()
	.use(auth)
	.get(
		"/:name",
		async ({ params: { name }, status }) => {
			const res = await storage.getObjectResponse(name);
			if (!res?.ok) return status(404);

			const { headers, body } = res;

			const response = new Response(body);

			response.headers.set(
				"cache-control",
				"public, max-age=31536000, immutable",
			);
			HEADERS.forEach((header) => {
				const value = headers.get(header);
				if (value) response.headers.set(header, value);
			});

			return response;
		},
		{ protected: true },
	);
