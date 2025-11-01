import type { ToastItem } from '@backend/types/toast';
import NotFoundPage from '@frontend/components/pages/not-found';
import type { RouterContext } from '@frontend/lib/router';
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
} from '@tanstack/react-router';
import { toast } from 'sonner';

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [{ title: 'vLab' }],
  }),
  beforeLoad: async ({ context }) => {
    if (context.auth.user === undefined) {
      context.auth.user = await context.auth.ensureData();
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
  component: () => (
    <>
      <HeadContent />
      <Outlet />
    </>
  ),
});
