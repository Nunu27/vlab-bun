import { success } from "@jawit/common";
import { uploadFile } from "@manager/lib/storage";
import auth from "@manager/services/http/middlewares/auth";
import { createRouter } from "@manager/services/http/plugins/system";
import { t } from "elysia";

export default createRouter()
	.use(auth)
	.post(
		"/upload",
		async ({ body: { file }, ENTITY: { LABEL: label } }) => {
			return success({
				message: `${label} uploaded`,
				data: await uploadFile(file),
			});
		},
		{
			private: ["instructor"],
			body: t.Object({
				file: t.File(),
			}),
		},
	);
