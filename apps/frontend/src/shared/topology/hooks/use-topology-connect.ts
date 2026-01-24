import { useCallback, useMemo } from 'react';
import { useTopologyStore } from '../stores';
import type { EdgeData } from '../types';

interface UseTopologyConnectOptions {
  deviceMap: Map<
    string,
    {
      icon: string;
      resources: { cpu?: number; memory?: string };
      interfaces: Array<{ name: string; configurable: boolean }>;
      categoryColor: string;
    }
  >;
  screenToWorld: (e: { clientX: number; clientY: number }) => {
    x: number;
    y: number;
  };
}

export const useTopologyConnect = ({
  deviceMap,
  screenToWorld,
}: UseTopologyConnectOptions) => {
  const store = useTopologyStore();
  const connectMode = store.use.connectMode();
  const connectSource = store.use.connectSource();
  const cursorPos = store.use.cursorPos();
  const modalOpen = store.use.modalOpen();
  const modalNodeId = store.use.modalNodeId();
  const nodes = store.use.nodes();

  const {
    setConnectSource,
    setCursorPos,
    setModalOpen,
    setModalNodeId,
    setNodes,
    setEdges,
  } = store.use.actions();

  const activeInterfaces = useMemo(() => {
    const node = nodes.find((n) => n.id === modalNodeId);
    if (!node || node.type !== 'device') return [];

    const deviceDef = deviceMap.get(node.deviceId);
    if (!deviceDef) return [];

    return deviceDef.interfaces.map((iface, index) => ({
      name: iface.name,
      configurable: iface.configurable,
      connected: node.interfaces[index] || !iface.configurable,
    }));
  }, [nodes, modalNodeId, deviceMap]);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (!connectMode) return false;

      if (!connectSource) {
        setModalNodeId(nodeId);
        setModalOpen(true);
      } else if (connectSource.nodeId !== nodeId) {
        setModalNodeId(nodeId);
        setModalOpen(true);
      }

      return true;
    },
    [connectMode, connectSource, setModalNodeId, setModalOpen],
  );

  const handleConnectMove = useCallback(
    (e: React.MouseEvent) => {
      if (!connectMode || !connectSource) return false;

      const worldPos = screenToWorld(e);
      setCursorPos(worldPos);

      return true;
    },
    [connectMode, connectSource, screenToWorld, setCursorPos],
  );

  const handleInterfaceSelect = useCallback(
    (ifaceName: string) => {
      if (!modalNodeId) return;

      setNodes((ns) =>
        ns.map((n) => {
          if (n.id === modalNodeId && n.type === 'device') {
            const deviceDef = deviceMap.get(n.deviceId);
            if (!deviceDef) return n;

            const ifaceIndex = deviceDef.interfaces.findIndex(
              (i) => i.name === ifaceName,
            );
            if (ifaceIndex === -1) return n;

            const newInterfaces = [...(n.interfaces || [])];
            while (newInterfaces.length <= ifaceIndex)
              newInterfaces.push(false);
            newInterfaces[ifaceIndex] = true;

            return {
              ...n,
              interfaces: newInterfaces,
            };
          }
          return n;
        }),
      );

      if (!connectSource) {
        setConnectSource({ nodeId: modalNodeId, ifaceId: ifaceName });
        setModalOpen(false);
      } else {
        const newEdge: EdgeData = {
          id: crypto.randomUUID(),
          source: connectSource.nodeId,
          sourceHandle: connectSource.ifaceId,
          target: modalNodeId,
          targetHandle: ifaceName,
          selected: false,
        };
        setEdges((prev) => [...prev, newEdge]);
        setConnectSource(null);
        // setConnectMode(false); // Do not exit connect mode
        setModalOpen(false);
      }
    },
    [
      modalNodeId,
      connectSource,
      deviceMap,
      setNodes,
      setConnectSource,
      setModalOpen,
      setEdges,
    ],
  );

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
  }, [setModalOpen]);

  return {
    connectMode,
    connectSource,
    cursorPos,
    modalOpen,
    modalNodeId,
    activeInterfaces,
    handleNodeClick,
    handleConnectMove,
    handleInterfaceSelect,
    handleModalClose,
  };
};
