import { createFileRoute } from '@tanstack/react-router';
import GuacamoleConnection from '@frontend/components/guacamole-connection';

export const Route = createFileRoute('/connect')({
  component: ConnectPage,
  validateSearch: (search: Record<string, unknown>): { token: string } => {
    return {
      token: (search.token as string) || '',
    };
  },
});

function ConnectPage() {
  const { token } = Route.useSearch();

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
    <div className="h-screen w-screen overflow-hidden bg-black">
      <GuacamoleConnection
        token={token}
        onDisconnect={() => {
          window.close();
        }}
      />
    </div>
  );
}
