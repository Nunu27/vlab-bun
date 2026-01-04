import LoadingPage from '@frontend/components/pages/loading-page';
import { routeTree } from '@frontend/routeTree.gen';
import { createRouter } from '@tanstack/react-router';

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPendingComponent: LoadingPage,
  defaultPendingMs: 0,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }

  interface StaticDataRouteOption {
    breadcrumbs?: Array<{ title: string; url?: string }>;
  }
}

export { router };
