import AppLoadingPage from '@frontend/components/pages/app-loading-page';
import ErrorPage from '@frontend/components/pages/error-page';
import ThemeToggle from '@frontend/components/theme-toggle';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@frontend/components/ui/breadcrumb';
import { Separator } from '@frontend/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@frontend/components/ui/sidebar';
import { getTitleFromBreadcrumbs } from '@frontend/helper/string';
import { protectedRoute } from '@frontend/lib/middlewares';
import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';
import { Fragment } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AppSidebar } from './_dashboard/-module/components/app-sidebar';
import { ChangePasswordModal } from './_dashboard/-module/components/modals/change-password-modal';
import { DashboardActionProvider } from './_dashboard/-module/stores/dashboard-action-store';

export const Route = createFileRoute('/_dashboard')({
  beforeLoad: protectedRoute(),
  pendingComponent: AppLoadingPage,
  component: RouteComponent,
});

function RouteComponent() {
  const breadcrumbs = useRouterState({
    select: (state) => {
      const breadcrumbs = state.matches.at(-1)?.staticData?.breadcrumbs ?? [];

      if (breadcrumbs.length) {
        document.title = getTitleFromBreadcrumbs(breadcrumbs);
      }

      return breadcrumbs;
    },
  });

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
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((breadcrumb, index) => (
                    <Fragment key={index}>
                      {index > 0 && (
                        <BreadcrumbSeparator
                          key={`sep-${index}`}
                          className="hidden md:block"
                        />
                      )}
                      <BreadcrumbItem
                        key={index}
                        className={index === 0 ? 'hidden md:block' : ''}
                      >
                        {breadcrumb.url ? (
                          <BreadcrumbLink asChild>
                            <Link to={breadcrumb.url}>{breadcrumb.title}</Link>
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>{breadcrumb.title}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    </Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <ThemeToggle />
          </header>
          <div className="flex-1 px-4">
            <ErrorBoundary FallbackComponent={ErrorPage}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </SidebarInset>
      </SidebarProvider>

      <ChangePasswordModal />
    </DashboardActionProvider>
  );
}
