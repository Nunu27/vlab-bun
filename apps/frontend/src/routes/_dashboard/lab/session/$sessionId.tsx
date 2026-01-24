import api from '@frontend/lib/api';
import { privateRoute } from '@frontend/lib/middlewares';
import { queryClient } from '@frontend/lib/query';
import { createFileRoute } from '@tanstack/react-router';
import TopologyViewer from '../-module/topology/viewer';
import { toKebabCase } from '@backend/utils/string';

export const Route = createFileRoute('/_dashboard/lab/session/$sessionId')({
  staticData: {
    breadcrumbs: [{ title: 'Labs', url: '/lab' }, { title: 'Session' }],
  },
  beforeLoad: privateRoute(['student']),
  loader: async ({ params: { sessionId } }) => {
    await api.lab.session({ id: sessionId }).get.ensureQueryData(queryClient);
  },
  component: SessionPage,
});

function SessionPage() {
  const { sessionId } = Route.useParams();

  const { data: session } = api.lab
    .session({ id: sessionId })
    .get.useSuspenseQuery();

  const handleNodeDoubleClick = (nodeId: string) => {
    const node = session.lab.topology.nodes.find((n) => n.id === nodeId);

    if (node && node.type === 'device') {
      const width = 1024;
      const height = 768;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      const nodeName = toKebabCase(node.label);
      const nodeId = session.nodes[nodeName].id;

      window.open(
        `/session/${sessionId}/node/${nodeId}/display`,
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
