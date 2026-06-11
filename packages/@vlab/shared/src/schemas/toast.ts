import { Type as t } from "@sinclair/typebox";

export const ToastItemSchema = t.Object({
	message: t.String(),
	type: t.Union([t.Literal("success"), t.Literal("error")]),
});

export type ToastItem = typeof ToastItemSchema.static;
