import { type ToastItem, ToastItemSchema } from "@vlab/shared/schemas";
import Elysia, { t } from "elysia";

export default new Elysia({ name: "toast" })
	.guard({
		cookie: t.Cookie({ toast: t.Optional(ToastItemSchema) }),
	})
	.resolve(({ cookie }) => ({
		setToast: (type: ToastItem["type"], message: string) => {
			cookie.toast.value = { message, type };
		},
	}))
	.as("scoped");
