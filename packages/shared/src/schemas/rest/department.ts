import { t } from "elysia/type-system";
import { NonEmptyString } from "../common";

export const CreateDepartmentRequest = t.Object({
	name: NonEmptyString()
});

export const UpdateDepartmentRequest = t.Object({
	name: NonEmptyString()
});
