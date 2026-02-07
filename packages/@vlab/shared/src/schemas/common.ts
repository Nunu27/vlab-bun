import type { TString } from "@sinclair/typebox";
import { t } from "elysia";

export const RequestWithId = <const TKeys extends string = "id">(
	entries?: TKeys[],
) =>
	t.Object(
		(entries ?? ["id" as TKeys]).reduce(
			(acc, entry) => {
				acc[entry] = t.String({ format: "uuid" });
				return acc;
			},
			{} as Record<TKeys, TString>,
		),
	);

export const NonEmptyString = (property: Parameters<typeof t.String>[0] = {}) =>
	t.String({
		minLength: 1,
		...property,
	});

export const DateRange = t.Object({
	from: t.Date(),
	to: t.Date(),
});
