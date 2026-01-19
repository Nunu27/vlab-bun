import { t } from "elysia/type-system";
import { NonEmptyString } from "./common";

export const UploadFileRequest = t.Object({
	file: t.File(),
	from: NonEmptyString()
});

export const DeleteFileRequest = t.Object({
	from: NonEmptyString()
});
