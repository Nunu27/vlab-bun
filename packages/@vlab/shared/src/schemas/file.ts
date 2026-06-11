import { Type as t } from "@sinclair/typebox";
import { FileSchema } from "./common";

export const UploadFileRequest = t.Object({
	file: FileSchema(),
});
