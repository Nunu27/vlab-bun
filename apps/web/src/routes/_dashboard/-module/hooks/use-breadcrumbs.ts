import { useRouterState } from "@tanstack/react-router";

export const useBreadcrumbs = () =>
	useRouterState({
		select: (state) => {
			const routerState = state.matches.at(-1);
			const rawBreadcrumbs = routerState?.staticData?.breadcrumbs ?? [];
			const data =
				routerState?.context.breadcrumbData ?? new Map<string, string>();

			if (!rawBreadcrumbs.length) return [];

			const breadcrumbs = rawBreadcrumbs.map((breadcrumb) => ({
				...breadcrumb,
				title:
					typeof breadcrumb.title === "function"
						? breadcrumb.title(data) || "Loading..."
						: breadcrumb.title,
			}));

			return breadcrumbs;
		},
	});
