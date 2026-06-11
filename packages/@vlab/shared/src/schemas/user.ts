import { Type as t } from "@sinclair/typebox";

export const ChangePasswordRequest = t.Object({
	newPassword: t.String({
		minLength: 8,
		maxLength: 128,
	}),
	confirmPassword: t.String({
		minLength: 8,
		maxLength: 128,
	}),
});
