import {
	createRouter,
	parseSearchWith,
	stringifySearchWith,
} from "@tanstack/react-router";
import ErrorPage from "@web/components/pages/error-page";
import LoadingPage from "@web/components/pages/loading-page";
import NotFoundPage from "@web/components/pages/not-found-page";
import { routeTree } from "@web/routeTree.gen";

type RouterContext = {
	breadcrumbData: Map<string, string>;
};

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	defaultPendingComponent: LoadingPage,
	defaultNotFoundComponent: NotFoundPage,
	defaultErrorComponent: ErrorPage,
	defaultPendingMs: 0,
	parseSearch: parseSearchWith((v) => v),
	stringifySearch: stringifySearchWith(JSON.stringify),
	context: {
		breadcrumbData: new Map(),
	} satisfies RouterContext,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}

	interface StaticDataRouteOption {
		breadcrumbs?: Array<{
			title: string | ((data: Map<string, string>) => string | undefined);
			url?: string;
		}>;
	}
}

export type { RouterContext };
export { router };
