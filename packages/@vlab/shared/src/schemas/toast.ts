import { t } from "elysia/type-system";

export const ToastItemSchema = t.Object({
	message: t.String(),
	type: t.UnionEnum(["success", "error"]),
});

export type ToastItem = typeof ToastItemSchema.static;
