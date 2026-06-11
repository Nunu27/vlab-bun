import { Type as t } from "@sinclair/typebox";
import { NonEmptyString } from "./common";

export const CreateDepartmentRequest = t.Object({
	name: NonEmptyString(),
});

export const UpdateDepartmentRequest = t.Object({
	name: NonEmptyString(),
});
