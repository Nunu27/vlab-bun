import AppLoadingPage from '@frontend/components/pages/app-loading-page';
import ErrorPage from '@frontend/components/pages/error-page';
import NotFoundPage from '@frontend/components/pages/not-found-page';
import api from '@frontend/lib/api';
import { queryClient } from '@frontend/lib/query';
import { router } from '@frontend/lib/router';
import { useAuthStore } from '@frontend/stores/auth-store';
import {
  HeadContent,
  Outlet,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router';
import type { ToastItem } from '@vlab/shared/types';
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router';
import { useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { toast } from 'sonner';

export const Route = createRootRoute({
  beforeLoad: async () => {
    const { user, actions } = useAuthStore.getState();

    if (user === undefined) {
      await actions.refresh();
    }

    const toastItemRaw = await cookieStore.get('toast');
    if (!toastItemRaw?.value) return;

    const { message, type } = JSON.parse(
      decodeURIComponent(toastItemRaw.value),
    ) as ToastItem;
    toast[type](message);

    await cookieStore.delete('toast');
  },
  pendingComponent: AppLoadingPage,
  notFoundComponent: NotFoundPage,
  component: RouteComponent,
});

function RouteComponent() {
  const loggedIn = useAuthStore((state) => !!state.user);
  const inLoginPage = useRouterState({
    select: (state) => state.matches.at(-1)?.pathname === '/login',
  });

  useEffect(() => {
    if (loggedIn !== inLoginPage) return;

    const redirectUrl = useAuthStore.getState().redirectUrl;
    if (!loggedIn) {
      api.auth.me.get.invalidateQuery(queryClient);
    }

    if (redirectUrl) {
      router.navigate({ href: redirectUrl, replace: true });
    } else {
      router.navigate({ to: loggedIn ? '/' : '/login', replace: true });
    }
  }, [loggedIn, inLoginPage]);

  if (inLoginPage === loggedIn) {
    return null;
  }

  return (
    <>
      <HeadContent />
      <NuqsAdapter>
        <ErrorBoundary FallbackComponent={ErrorPage}>
          <Outlet />
        </ErrorBoundary>
      </NuqsAdapter>
    </>
  );
}
