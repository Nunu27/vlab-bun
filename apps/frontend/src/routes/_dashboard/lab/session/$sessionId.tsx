import LoadingPage from '@frontend/components/pages/loading';
import api from '@frontend/lib/api';
import {
  getErrorMessageFromApi,
  getTitleFromBreadcrumbs,
} from '@frontend/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import TopologyViewer from '../-module/topology/viewer';
import { privateRoute } from '@frontend/lib/middlewares';

const breadcrumbs = [{ title: 'Labs', url: '/lab' }, { title: 'Session' }];

export const Route = createFileRoute('/_dashboard/lab/session/$sessionId')({
  head: () => ({
    meta: [{ title: getTitleFromBreadcrumbs(breadcrumbs) }],
  }),
  beforeLoad: ({ context }) => {
    privateRoute(['student'])({ context });

    context.breadcrumbs = breadcrumbs;
  },
  component: SessionPage,
});

function SessionPage() {
  const { sessionId } = Route.useParams();

  const {
    data: session,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['lab', 'session', sessionId],
    queryFn: async () => {
      const result = await api.lab.session({ id: sessionId }).get();
      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }
      return result.data;
    },
  });

  if (isLoading) return <LoadingPage />;
  if (error)
    return <div className="p-4 text-red-500">Error: {error.message}</div>;
  if (!session) return <div className="p-4">Session not found</div>;

  const handleNodeDoubleClick = (nodeId: string) => {
    // Find the node in the topology
    const node = session.lab.topology.nodes.find((n) => n.id === nodeId);

    if (node && node.type === 'device' && node.token) {
      // Open connection window
      const width = 1024;
      const height = 768;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      window.open(
        `/connect?token=${encodeURIComponent(node.token)}`,
        `vlab-session-${nodeId}`,
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,location=no,toolbar=no,menubar=no`,
      );
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col space-y-4">
      <div className="flex-1 overflow-hidden border-t">
        <TopologyViewer
          topology={session.lab.topology}
          onNodeDoubleClick={handleNodeDoubleClick}
        />
      </div>
    </div>
  );
}
