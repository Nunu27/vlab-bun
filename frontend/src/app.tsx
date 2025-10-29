import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import { useAuth } from '@frontend/hooks/use-auth';
import { queryClient } from '@frontend/lib/query';
import { router } from '@frontend/lib/router';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProviderWithContext />
    </QueryClientProvider>
  );
}

function RouterProviderWithContext() {
  const auth = useAuth();

  return <RouterProvider router={router} context={{ auth }} />;
}

export { App };
