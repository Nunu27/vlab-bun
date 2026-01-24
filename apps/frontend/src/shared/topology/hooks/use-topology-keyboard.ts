import { useEffect, type RefObject } from 'react';
import { useTopologyStore } from '../stores';
import type { useDeviceMap } from './use-device-map';

interface UseTopologyKeyboardProps {
  canvasRef: RefObject<HTMLDivElement | null>;
  deviceMap: ReturnType<typeof useDeviceMap>;
}

export const useTopologyKeyboard = ({
  canvasRef,
  deviceMap,
}: UseTopologyKeyboardProps) => {
  const store = useTopologyStore();
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we are editing a text input (like note label)
      if (
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'INPUT'
      ) {
        return;
      }

      const { nodes, connectMode, actions } = store.getState();

      switch (e.key.toLowerCase()) {
        case 'delete':
        case 'backspace':
          e.preventDefault();
          actions.deleteSelected(deviceMap);
          break;
        case 'c':
          e.preventDefault();
          actions.setConnectMode(!connectMode);
          actions.setConnectSource(null);
          break;
        case 'g':
          e.preventDefault();
          if (nodes.filter((n) => n.selected).length >= 2) {
            actions.groupSelected();
          }
          break;
        case 'u':
          e.preventDefault();
          if (nodes.some((n) => n.selected && n.type === 'group')) {
            actions.ungroupSelected();
          }
          break;
        case 'n':
          e.preventDefault();
          if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            actions.addNote({ x: rect.width / 2, y: rect.height / 2 });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store, deviceMap, canvasRef]);
};
