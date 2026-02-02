import { ToastItemSchema } from "@vlab/shared/schemas";
import Elysia, { t } from "elysia";

export default new Elysia({ name: "toast" })
	.guard({
		cookie: t.Cookie({ toast: t.Optional(ToastItemSchema) }),
	})
	.as("scoped");
