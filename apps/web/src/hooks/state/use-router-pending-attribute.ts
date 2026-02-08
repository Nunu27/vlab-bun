import { router } from "@web/lib/router";
import { useEffect } from "react";
import { useDebounceCallback } from "usehooks-ts";

export function useRouterPendingAttribute() {
	const onResolved = useDebounceCallback(() => {
		document.body.removeAttribute("data-router-pending");
	}, 500);

	useEffect(() => {
		const unsubStart = router.subscribe("onBeforeLoad", () => {
			onResolved.cancel();
			document.body.setAttribute("data-router-pending", "true");
		});
		const unsubEnd = router.subscribe("onResolved", () => {
			onResolved();
		});

		return () => {
			unsubStart();
			unsubEnd();
		};
	}, [onResolved]);
}
