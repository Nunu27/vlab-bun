import {
	type StaticDecode,
	type TSchema,
	type TString,
	Type as t,
} from "@sinclair/typebox";

export const Nullable = <T extends TSchema>(schema: T) =>
	t.Union([schema, t.Null()]);

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

const DateSchema = t
	.Transform(t.Union([t.Date(), t.String()]))
	.Decode(
		(value): Date => (typeof value === "string" ? new Date(value) : value),
	)
	.Encode((value) => value.toISOString());

export const DateRange = t.Object({
	from: DateSchema,
	to: DateSchema,
});

export type DateRange = StaticDecode<typeof DateRange>;
