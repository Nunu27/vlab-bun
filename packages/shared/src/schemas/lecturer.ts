import { t } from "elysia/type-system";

export const CreateLecturerRequest = t.Object({
	name: t.String({ minLength: 1 }),
	email: t.String({ format: "email" }),
	nip: t.String({ minLength: 1, maxLength: 100, format: "numeric" }),
	password: t.String({
		minLength: 8,
		maxLength: 128
	})
});

export const UpdateLecturerRequest = t.Object({
	name: t.String({ minLength: 1 }),
	email: t.String({ format: "email" }),
	nip: t.String({ minLength: 1, maxLength: 100, format: "numeric" })
});
