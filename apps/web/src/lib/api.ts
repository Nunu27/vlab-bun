import type { App } from "@api/server";
import { treaty } from "@elysiajs/eden";
import { treatyQuery } from "@jawit/query";
import { toast } from "sonner";

const client = treaty<App>(window.location.origin);
export default treatyQuery(client.api, {
	onErrorMessage: toast.error,
	onSuccessMessage: toast.success,
});
