import { useWSTopicData } from '@frontend/hooks/use-topic';
import api from '@frontend/lib/api';
import { protectedRoute } from '@frontend/lib/middlewares';
import { queryClient } from '@frontend/lib/query';
import GuacamoleConnection from '@frontend/shared/guacamole/components/guacamole-connection';
import { GuacamoleConnectionStates } from '@frontend/shared/guacamole/components/guacamole-connection-states';
import { GuacamoleConnectionProvider } from '@frontend/shared/guacamole/stores/guacamole-connection-store';
import { labNodeHealthTopic } from '@shared/schemas/ws';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/session/$id/node/$nodeId/display')({
  beforeLoad: protectedRoute(),
  component: ConnectPage,
  loader: async ({ params: { id, nodeId } }) => {
    await api.lab
      .session({ id })
      .node({ nodeId })
      .get.ensureQueryData(queryClient);
  },
});

function ConnectPage() {
  const { id, nodeId } = Route.useParams();

  const { data } = api.lab
    .session({ id })
    .node({ nodeId })
    .get.useSuspenseQuery();
  const health =
    useWSTopicData(labNodeHealthTopic, 'health/:nodeId', { nodeId }) ??
    data.health;

  useEffect(() => {
    document.title = data.name;
  }, [data]);

  if (health === 'starting') {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-black">
        <GuacamoleConnectionStates
          state="waiting"
          title="Node Starting"
          description="Waiting for node to be ready..."
          spinnerColor="amber"
        />
      </div>
    );
  }

  if (health === 'deleted') {
    return (
      <div className="relative h-screen w-screen overflow-hidden bg-black">
        <GuacamoleConnectionStates
          state="error"
          title="Node Deleted"
          description="This node has been deleted. Please close this window."
        />
      </div>
    );
  }

  return (
    <GuacamoleConnectionProvider>
      <div className="h-screen w-screen overflow-hidden bg-black">
        <GuacamoleConnection
          token={data.token}
          onDisconnect={() => {
            window.close();
          }}
        />
      </div>
    </GuacamoleConnectionProvider>
  );
}
