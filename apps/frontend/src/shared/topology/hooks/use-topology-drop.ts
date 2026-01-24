import { useCallback } from 'react';
import { useTopologyStore } from '../stores';
import { snapToGrid } from '../utils';
import type { DeviceNodeData, NoteNodeData } from '../types';

interface UseTopologyDropOptions {
  screenToWorld: (e: { clientX: number; clientY: number }) => {
    x: number;
    y: number;
  };
}

type DeviceDropData = {
  id: string;
  name: string;
  interfaces: Array<{ name: string; configurable: boolean }>;
  resources: { cpu: number; memory: string };
};

export const useTopologyDrop = ({ screenToWorld }: UseTopologyDropOptions) => {
  const store = useTopologyStore();
  const nodes = store.use.nodes();
  const { setNodes } = store.use.actions();

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('nodeType');
      if (!type) return;

      const worldPos = screenToWorld(e);

      if (type === 'note') {
        const newNode: NoteNodeData = {
          id: crypto.randomUUID(),
          type: 'note',
          content: '',
          x: snapToGrid(worldPos.x),
          y: snapToGrid(worldPos.y),
          width: 200,
          height: 100,
          selected: true,
        };
        setNodes((prev) => [
          ...prev.map((n) => ({ ...n, selected: false })),
          newNode,
        ]);
        return;
      }

      if (type === 'device') {
        const deviceDataStr = e.dataTransfer.getData('deviceData');
        if (!deviceDataStr) return;
        const deviceData = JSON.parse(deviceDataStr) as DeviceDropData;

        let newName = deviceData.name;
        let counter = 1;
        let isUnique = false;
        while (!isUnique) {
          const potentialName = `${deviceData.name}-${counter}`;
          const exists = nodes.some(
            (n) => n.type === 'device' && n.name === potentialName,
          );
          if (!exists) {
            newName = potentialName;
            isUnique = true;
          } else {
            counter++;
          }
        }

        const newNode: DeviceNodeData = {
          id: crypto.randomUUID(),
          type: 'device',
          deviceId: deviceData.id,
          name: newName,
          x: snapToGrid(worldPos.x - 30),
          y: snapToGrid(worldPos.y - 30),
          interfaces: deviceData.interfaces
            ? deviceData.interfaces.map((i) => !i.configurable)
            : [],
          resources: deviceData.resources
            ? { ...deviceData.resources }
            : { cpu: 1, memory: '512M' },
          groupIds: [],
          selected: true,
        };

        setNodes((prev) => [
          ...prev.map((n) => ({ ...n, selected: false })),
          newNode,
        ]);
      }
    },
    [nodes, screenToWorld, setNodes],
  );

  return {
    handleDrop,
  };
};
