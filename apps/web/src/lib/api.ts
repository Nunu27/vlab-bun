import { treaty, treatyQuery } from "@jawit/query";
import type { App } from "@manager/server";
import { toast } from "sonner";

const client = treaty<App>(window.location.origin);
export default treatyQuery(client.api, {
	onErrorMessage: toast.error,
	onSuccessMessage: toast.success,
});
