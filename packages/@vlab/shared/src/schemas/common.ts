import { t } from "elysia/type-system";

export const RequestWithId = t.Object({
	id: t.String({ format: "uuid" }),
});

export const NonEmptyString = (property: Parameters<typeof t.String>[0] = {}) =>
	t.String({
		minLength: 1,
		...property,
	});
