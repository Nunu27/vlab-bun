import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { StandardSchemaV1 } from "@standard-schema/spec";

export function toStandardSchema<T extends TSchema>(
	schema: T,
): StandardSchemaV1<unknown, Static<T>> {
	return {
		"~standard": {
			version: 1,
			vendor: "typebox",
			validate(value) {
				if (Value.Check(schema, value)) {
					return { value: value as Static<T> };
				}

				return {
					issues: [...Value.Errors(schema, value)].map((error) => ({
						message: error.message,
						path: error.path.split("/").filter(Boolean),
					})),
				};
			},
		},
	};
}
