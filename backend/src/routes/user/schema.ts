import { t } from "elysia";

export const ChangePasswordRequest = t.Object({
	newPassword: t.String({
		minLength: 8,
		maxLength: 128
	}),
	confirmPassword: t.String({
		minLength: 8,
		maxLength: 128
	})
});
