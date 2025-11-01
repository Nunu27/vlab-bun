import { t } from "elysia";

export const CreateLecturerRequest = t.Object({
	name: t.String(),
	email: t.String({ format: "email" }),
	nip: t.String({ minLength: 1, maxLength: 100, format: "numeric" }),
	password: t.String({
		minLength: 8,
		maxLength: 128
	})
});

export const UpdateLecturerRequest = t.Object({
	name: t.String(),
	email: t.String({ format: "email" }),
	nip: t.String({ minLength: 1, maxLength: 100, format: "numeric" })
});
