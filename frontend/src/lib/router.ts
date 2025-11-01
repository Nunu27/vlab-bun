import { createRouter } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';

import { queryClient } from '@frontend/lib/query';
import { routeTree } from '@frontend/routeTree.gen';
import type { AuthData } from '@frontend/hooks/use-auth';

type BreadcrumbItem = {
  title: string;
  url?: string;
};

type RouterContext = {
  auth: AuthData;
  queryClient: QueryClient;
  breadcrumbs: BreadcrumbItem[];
};

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: {
    queryClient,
    breadcrumbs: [],
    auth: null as unknown as AuthData,
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export { router };
export type { RouterContext };
