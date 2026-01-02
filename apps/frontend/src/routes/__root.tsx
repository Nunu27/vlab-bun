import NotFoundPage from '@frontend/components/pages/not-found';
import { useAuthStore } from '@frontend/stores/auth';
import {
  HeadContent,
  Outlet,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router';
import type { ToastItem } from '@vlab/shared/types';
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router';
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
  notFoundComponent: NotFoundPage,
  component: RouteComponent,
});

function RouteComponent() {
  const loggedIn = useAuthStore((state) => !!state.user);
  const inLoginPage = useRouterState({
    select: (state) => state.matches.at(-1)?.pathname === '/login',
  });

  if (inLoginPage === loggedIn) {
    return null;
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
