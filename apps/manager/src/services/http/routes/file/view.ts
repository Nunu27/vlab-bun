import storage from "@manager/lib/storage";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";

const SAFE_CONTENT_TYPES = new Set([
	"application/pdf",
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp",
	"image/svg+xml",
]);

const PASS_THROUGH_HEADERS = ["last-modified", "etag"];

export default createRouter()
	.use(auth)
	.get(
		"/:name",
		async ({ params: { name }, status }) => {
			const res = await storage.getObjectResponse(name);
			if (!res?.ok) return status(404);

			const { headers, body } = res;

			const contentType = headers.get("content-type") ?? "";
			const mimeType = contentType.split(";")[0].trim();

			if (!SAFE_CONTENT_TYPES.has(mimeType)) return status(415);

			const response = new Response(body);

			response.headers.set("content-type", mimeType);
			response.headers.set("content-disposition", "inline");
			response.headers.set(
				"cache-control",
				"public, max-age=31536000, immutable",
			);
			// Prevent SVG/PDF from running scripts even if rendered inline
			response.headers.set("content-security-policy", "default-src 'none'");
			response.headers.set("x-content-type-options", "nosniff");

			PASS_THROUGH_HEADERS.forEach((header) => {
				const value = headers.get(header);
				if (value) response.headers.set(header, value);
			});

			return response;
		},
		{ protected: true },
	);
