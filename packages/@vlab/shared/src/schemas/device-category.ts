import { t } from "elysia/type-system";
import { NonEmptyString } from "./common";

export const CreateDeviceCategoryRequest = t.Object({
	name: NonEmptyString(),
	color: NonEmptyString(),
});

export const UpdateDeviceCategoryRequest = t.Object({
	name: NonEmptyString(),
	color: NonEmptyString(),
});
