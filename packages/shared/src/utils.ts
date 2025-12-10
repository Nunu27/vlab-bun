import type { TSchema } from "elysia";
import { t } from "elysia/type-system";

export const Stringified = <V extends TSchema>(value: V) => {
	return t
		.Transform(t.Union([t.String(), value]))
		.Decode((v) => {
			if (typeof v === "string") {
				try {
					return JSON.parse(v);
				} catch {
					throw new Error("Invalid JSON");
				}
			}

			return v as V["static"];
		})
		.Encode((v) => JSON.stringify(v));
};
