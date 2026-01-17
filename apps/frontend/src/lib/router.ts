import ErrorPage from '@frontend/components/pages/error-page';
import LoadingPage from '@frontend/components/pages/loading-page';
import NotFoundPage from '@frontend/components/pages/not-found-page';
import { routeTree } from '@frontend/routeTree.gen';
import { createRouter } from '@tanstack/react-router';

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPendingComponent: LoadingPage,
  defaultNotFoundComponent: NotFoundPage,
  defaultErrorComponent: ErrorPage,
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
