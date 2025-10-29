import { createRouter } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';

import { queryClient } from '@frontend/lib/query';
import { routeTree } from '@frontend/routeTree.gen';
import type { AuthData } from '@frontend/hooks/use-auth';

type RouterContext = {
  auth: AuthData;
  queryClient: QueryClient;
};

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: {
    auth: null as unknown as AuthData,
    queryClient,
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export { router };
export type { RouterContext };
