import AppLoadingPage from '@frontend/components/pages/app-loading-page';
import ThemeToggle from '@frontend/components/theme-toggle';
import { Separator } from '@frontend/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@frontend/components/ui/sidebar';
import { protectedRoute } from '@frontend/lib/middlewares';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import AppBreadcrumb from './_dashboard/-module/components/app-breadcrumb';
import { AppSidebar } from './_dashboard/-module/components/app-sidebar';
import { ChangePasswordModal } from './_dashboard/-module/components/modals/change-password-modal';
import { DashboardActionProvider } from './_dashboard/-module/stores/dashboard-action-store';

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: protectedRoute(),
  pendingComponent: AppLoadingPage,
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <DashboardActionProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <AppBreadcrumb />
            </div>
            <ThemeToggle />
          </header>
          <div className="flex-1 px-4">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>

      <ChangePasswordModal />
    </DashboardActionProvider>
  );
}
