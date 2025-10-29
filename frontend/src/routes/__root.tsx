import { Toaster } from '@frontend/components/ui/sonner';
import type { RouterContext } from '@frontend/lib/router';
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
} from '@tanstack/react-router';

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [{ title: 'vLab' }],
  }),
  loader: async ({ context }) => {
    if (context.auth.user === undefined) {
      const user = await context.auth.ensureData();
      return { user };
    }

    return { user: context.auth.user };
  },
  component: () => {
    return (
      <>
        <HeadContent />
        <Outlet />
        <Toaster />
      </>
    );
  },
});
