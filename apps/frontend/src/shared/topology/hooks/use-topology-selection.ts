import { useCallback } from 'react';
import { useTopologyStore } from '../stores';
import { DEFAULT_DEVICE_HEIGHT, DEFAULT_DEVICE_WIDTH } from '../constants';

interface UseTopologySelectionOptions {
  screenToWorld: (e: { clientX: number; clientY: number }) => {
    x: number;
    y: number;
  };
}

export const useTopologySelection = ({
  screenToWorld,
}: UseTopologySelectionOptions) => {
  const store = useTopologyStore();
  const selectionBox = store.use.selectionBox();
  const nodes = store.use.nodes();
  const { setSelectionBox, setNodes, setEdges } = store.use.actions();

  const startSelection = useCallback(
    (e: React.MouseEvent, clearExisting: boolean = true) => {
      if (clearExisting) {
        setNodes((ns) => ns.map((n) => ({ ...n, selected: false })));
        setEdges((es) => es.map((e) => ({ ...e, selected: false })));
      }
      const worldPos = screenToWorld(e);
      setSelectionBox({ start: worldPos, current: worldPos });
    },
    [screenToWorld, setSelectionBox, setNodes, setEdges],
  );

  const handleSelectionMove = useCallback(
    (e: React.MouseEvent) => {
      if (!selectionBox) return false;

      const worldPos = screenToWorld(e);
      setSelectionBox((prev) => (prev ? { ...prev, current: worldPos } : null));

      return true;
    },
    [selectionBox, screenToWorld, setSelectionBox],
  );

  const handleSelectionEnd = useCallback(
    (e: React.MouseEvent) => {
      if (!selectionBox) return false;

      const x1 = Math.min(selectionBox.start.x, selectionBox.current.x);
      const x2 = Math.max(selectionBox.start.x, selectionBox.current.x);
      const y1 = Math.min(selectionBox.start.y, selectionBox.current.y);
      const y2 = Math.max(selectionBox.start.y, selectionBox.current.y);

      setNodes((ns) =>
        ns.map((n) => {
          const width = n.type === 'device' ? DEFAULT_DEVICE_WIDTH : n.width;
          const height = n.type === 'device' ? DEFAULT_DEVICE_HEIGHT : n.height;
          const center = { x: n.x + width / 2, y: n.y + height / 2 };
          const selected =
            center.x >= x1 &&
            center.x <= x2 &&
            center.y >= y1 &&
            center.y <= y2;
          return {
            ...n,
            selected: e.shiftKey ? n.selected || selected : selected,
          };
        }),
      );
      setSelectionBox(null);

      return true;
    },
    [selectionBox, setNodes, setSelectionBox],
  );

  const selectNode = useCallback(
    (nodeId: string, isShift: boolean) => {
      const node = nodes.find((n) => n.id === nodeId);

      setEdges((es) => es.map((e) => ({ ...e, selected: false })));

      if (!isShift && !node?.selected) {
        setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === nodeId })));
      } else if (isShift) {
        setNodes((ns) =>
          ns.map((n) =>
            n.id === nodeId ? { ...n, selected: !n.selected } : n,
          ),
        );
      }
    },
    [nodes, setNodes, setEdges],
  );

  return {
    selectionBox,
    startSelection,
    handleSelectionMove,
    handleSelectionEnd,
    selectNode,
  };
};
