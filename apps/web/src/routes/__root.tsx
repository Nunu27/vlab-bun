import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Navigate,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ToastItem } from "@vlab/shared/schemas/toast";
import AppLoadingPage from "@web/components/pages/app-loading-page";
import { TooltipProvider } from "@web/components/ui/tooltip";
import { useRouterPendingAttribute } from "@web/hooks/state/use-router-pending-attribute";
import api from "@web/lib/api";
import { queryClient } from "@web/lib/query";
import type { RouterContext } from "@web/lib/router";
import { useAuthStore } from "@web/stores/auth-store";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { toast } from "sonner";

import "@web/lib/ws";

export const Route = createRootRouteWithContext<RouterContext>()({
	beforeLoad: async () => {
		const { user, actions } = useAuthStore.getState();

		if (user === undefined) {
			await actions.refresh();
		}

		const toastItemRaw = await cookieStore.get("toast");
		if (!toastItemRaw?.value) return;

		const { message, type } = JSON.parse(
			decodeURIComponent(toastItemRaw.value),
		) as ToastItem;
		toast[type](message);

		await cookieStore.delete("toast");
	},
	onStay: ({ context }) => {
		context.breadcrumbData.clear();
	},
	pendingComponent: AppLoadingPage,
	component: RouteComponent,
});

function RouteComponent() {
	const inLoginPage = useRouterState({
		select: (state) => state.matches.at(-1)?.pathname === "/login",
	});
	const redirectUrl = useAuthStore((state) => {
		const loggedIn = !!state.user;
		if (loggedIn !== inLoginPage) return null;

		const redirectUrl = state.redirectUrl;
		if (!loggedIn) {
			api.auth.me.get.invalidateQuery(queryClient);
		}

		return redirectUrl ?? (loggedIn ? "/" : "/login");
	});

	useRouterPendingAttribute();

	if (redirectUrl) {
		return <Navigate to="/" href={redirectUrl} replace />;
	}

	return (
		<>
			<HeadContent />
			<NuqsAdapter>
				<TooltipProvider>
					<Outlet />

					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "TanStack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							{
								name: "Tanstack Query",
								render: <ReactQueryDevtoolsPanel />,
							},
						]}
					/>
				</TooltipProvider>
			</NuqsAdapter>
		</>
	);
}
