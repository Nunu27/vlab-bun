import { Type as t } from "@sinclair/typebox";
import { NonEmptyString } from "./common";

export const CreateAdminRequest = t.Object({
	name: NonEmptyString(),
	email: t.String({ format: "email" }),
	password: t.String({
		minLength: 8,
		maxLength: 128,
	}),
});

export const UpdateAdminRequest = t.Object({
	name: NonEmptyString(),
	email: t.String({ format: "email" }),
});
