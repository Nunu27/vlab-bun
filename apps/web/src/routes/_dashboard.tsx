import { createFileRoute, Outlet } from "@tanstack/react-router";
import pkg from "@web/../package.json";
import { ModeToggle } from "@web/components/buttons/mode-toggle";
import AppLoadingPage from "@web/components/pages/app-loading-page";
import { Separator } from "@web/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@web/components/ui/sidebar";
import { protectedRoute } from "@web/lib/middlewares";
import AppBreadcrumb from "./_dashboard/-module/components/app-breadcrumb";
import { AppSidebar } from "./_dashboard/-module/components/app-sidebar";

import { NavUser } from "./_dashboard/-module/components/nav-user";

export const Route = createFileRoute("/_dashboard")({
	beforeLoad: protectedRoute(),
	pendingComponent: AppLoadingPage,
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="min-w-0">
				<header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
					<div className="flex items-center gap-2">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2" />
						<AppBreadcrumb />
					</div>
					<div className="flex items-center gap-2">
						<ModeToggle />
						<NavUser />
					</div>
				</header>
				<div className="flex-1 p-4 pt-0">
					<Outlet />
				</div>
				<footer className="mt-auto flex items-center justify-end gap-1 p-4 text-muted-foreground text-xs">
					&copy; {new Date().getFullYear()}
					{" • "}v{pkg.version}
				</footer>
			</SidebarInset>
		</SidebarProvider>
	);
}
