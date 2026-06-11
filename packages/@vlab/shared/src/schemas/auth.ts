import { Type as t } from "@sinclair/typebox";
import { Nullable } from "./common";

export const LoginRequest = t.Object({
	email: t.String({ format: "email" }),
	password: t.String({
		minLength: 8,
		maxLength: 128,
	}),
});

export const AuthChangePasswordRequest = t.Object({
	oldPassword: Nullable(
		t.String({
			minLength: 8,
			maxLength: 128,
		}),
	),
	newPassword: t.String({
		minLength: 8,
		maxLength: 128,
	}),
	confirmPassword: t.String({
		minLength: 8,
		maxLength: 128,
	}),
});
