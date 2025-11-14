import { t } from "elysia";

export const CreateAdminRequest = t.Object({
	name: t.String({ minLength: 1 }),
	email: t.String({ format: "email" }),
	password: t.String({
		minLength: 8,
		maxLength: 128
	})
});

export const UpdateAdminRequest = t.Object({
	name: t.String({ minLength: 1 }),
	email: t.String({ format: "email" })
});
