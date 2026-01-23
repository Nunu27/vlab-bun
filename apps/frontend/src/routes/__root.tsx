import AppLoadingPage from '@frontend/components/pages/app-loading-page';
import { useRouterPendingAttribute } from '@frontend/hooks/use-router-pending-attribute';
import api from '@frontend/lib/api';
import { queryClient } from '@frontend/lib/query';
import type { RouterContext } from '@frontend/lib/router';
import { useAuthStore } from '@frontend/stores/auth-store';
import {
  HeadContent,
  Navigate,
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from '@tanstack/react-router';
import type { ToastItem } from '@vlab/shared/types';
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router';
import { toast } from 'sonner';

export const Route = createRootRouteWithContext<RouterContext>()({
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
  onStay: ({ context }) => {
    context.breadcrumbData.clear();
  },
  pendingComponent: AppLoadingPage,
  component: RouteComponent,
});

function RouteComponent() {
  const inLoginPage = useRouterState({
    select: (state) => state.matches.at(-1)?.pathname === '/login',
  });
  const redirectUrl = useAuthStore((state) => {
    const loggedIn = !!state.user;
    if (loggedIn !== inLoginPage) return null;

    const redirectUrl = state.redirectUrl;
    if (!loggedIn) {
      api.auth.me.get.invalidateQuery(queryClient);
    }

    return redirectUrl ?? (loggedIn ? '/' : '/login');
  });

  useRouterPendingAttribute();

  if (redirectUrl) {
    return <Navigate to="/" href={redirectUrl} replace />;
  }

  return (
    <>
      <HeadContent />
      <NuqsAdapter>
        <Outlet />
      </NuqsAdapter>
    </>
  );
}
