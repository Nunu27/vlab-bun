import { Type as t } from "@sinclair/typebox";
import { NonEmptyString } from "./common";

export const CreateInstructorRequest = t.Object({
	name: NonEmptyString(),
	email: t.String({ format: "email" }),
	nip: NonEmptyString({ maxLength: 100, format: "numeric" }),
	password: t.String({
		minLength: 8,
		maxLength: 128,
	}),
});

export const UpdateInstructorRequest = t.Object({
	name: NonEmptyString(),
	email: t.String({ format: "email" }),
	nip: NonEmptyString({ maxLength: 100, format: "numeric" }),
});
