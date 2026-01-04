import { protectedRoute } from '@frontend/lib/middlewares';
import GuacamoleConnection from '@frontend/shared/guacamole/components/guacamole-connection';
import { GuacamoleConnectionProvider } from '@frontend/shared/guacamole/stores/guacamole-connection';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/connect')({
  beforeLoad: protectedRoute(),
  component: ConnectPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { token: string; title?: string } => {
    return {
      token: (search.token as string) || '',
      title: (search.title as string) || undefined,
    };
  },
});

function ConnectPage() {
  const { token, title } = Route.useSearch();

  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Missing Token</h1>
          <p className="mt-2 text-gray-400">
            No connection token provided. Please close this window and try
            again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <GuacamoleConnectionProvider>
      <div className="h-screen w-screen overflow-hidden bg-black">
        <GuacamoleConnection
          token={token}
          onDisconnect={() => {
            window.close();
          }}
        />
      </div>
    </GuacamoleConnectionProvider>
  );
}
