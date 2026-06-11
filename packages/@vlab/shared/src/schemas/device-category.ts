import { Type as t } from "@sinclair/typebox";
import { NonEmptyString } from "./common";

export const CreateDeviceCategoryRequest = t.Object({
	name: NonEmptyString(),
	color: NonEmptyString(),
});

export const UpdateDeviceCategoryRequest = t.Object({
	name: NonEmptyString(),
	color: NonEmptyString(),
});
