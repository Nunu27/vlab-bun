import { t } from "elysia/type-system";

export const UploadFileRequest = t.Object({
	file: t.File(),
});
