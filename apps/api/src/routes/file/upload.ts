import auth from "@api/middlewares/auth";
import { createRouter } from "@api/plugins/system";
import { uploadFile } from "@api/services/storage";
import { success } from "@jawit/common";
import { UploadFileRequest } from "@vlab/shared/schemas/file";

export default createRouter()
	.use(auth)
	.post(
		"/upload",
		async ({ body: { file }, entity: { label } }) => {
			return success({
				message: `${label} uploaded`,
				data: await uploadFile(file),
			});
		},
		{
			private: ["instructor"],
			body: UploadFileRequest,
		},
	);
