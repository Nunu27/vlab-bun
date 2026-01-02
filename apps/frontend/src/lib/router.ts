import { createRouter } from '@tanstack/react-router';
import { routeTree } from '@frontend/routeTree.gen';

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
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
