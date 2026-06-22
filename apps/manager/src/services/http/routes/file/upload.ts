import { success } from "@jawit/common";
import { uploadFile } from "@manager/lib/storage";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { t } from "elysia";

const ALLOWED_MIME_TYPES = new Set([
	"application/pdf",
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp",
	"image/svg+xml",
]);

export default createRouter()
	.use(auth)
	.post(
		"/upload",
		async ({ body: { file }, ENTITY: { LABEL: label }, status }) => {
			if (!ALLOWED_MIME_TYPES.has(file.type)) {
				return status(415, "Unsupported file type");
			}

			return success({
				message: `${label} uploaded`,
				data: await uploadFile(file),
			});
		},
		{
			private: ["instructor"],
			body: t.Object({
				file: t.File({
					type: [...ALLOWED_MIME_TYPES],
				}),
			}),
		},
	);
