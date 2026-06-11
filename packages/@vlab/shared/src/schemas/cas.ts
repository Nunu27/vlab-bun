import { Type as t } from "@sinclair/typebox";

export const CASRequestQuery = t.Object({
	ticket: t.Optional(t.String()),
});

export const CASResponseSchema = t.Object({
	serviceResponse: t.Object({
		authenticationSuccess: t.Optional(
			t.Object({
				user: t.String(),
				attributes: t.Object({
					uid: t.String(),
					Name: t.String(),
					mail: t.String(),
					Status: t.String(),
					NRP: t.Number(),
					Jurusan: t.String(),
					netid: t.String(),
				}),
			}),
		),
	}),
});
