import {
	createRouter,
	parseSearchWith,
	stringifySearchWith,
} from "@tanstack/react-router";
import ErrorPage from "@web/components/pages/error-page";
import LoadingPage from "@web/components/pages/loading-page";
import NotFoundPage from "@web/components/pages/not-found-page";
import { routeTree } from "@web/routeTree.gen";

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	defaultPendingComponent: LoadingPage,
	defaultNotFoundComponent: NotFoundPage,
	defaultErrorComponent: ErrorPage,
	defaultPendingMs: 0,
	parseSearch: parseSearchWith((v) => v),
	stringifySearch: stringifySearchWith(JSON.stringify),
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}

	interface StaticDataRouteOption {
		breadcrumbs?: Array<{
			title:
				| string
				| ((
						loaderData: Record<string, string | undefined>,
				  ) => string | undefined);
			url?: string;
		}>;
	}
}

export { router };
