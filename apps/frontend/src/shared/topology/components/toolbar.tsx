import { ActionButton } from '@frontend/components/action-button';
import type { DeviceInterface } from '@vlab/shared/schemas/rest';
import { Group, StickyNote, Trash2, Ungroup, Unplug } from 'lucide-react';
import { useTopologyStore } from '../stores';

export default function Toolbar({
  deviceMap,
}: {
  deviceMap: Map<string, { interfaces: DeviceInterface[] }>;
}) {
  const store = useTopologyStore();

  const nodes = store.use.nodes();
  const edges = store.use.edges();
  const connectMode = store.use.connectMode();
  const {
    setConnectMode,
    setConnectSource,
    groupSelected,
    ungroupSelected,
    addNote,
    deleteSelected,
  } = store.use.actions();

  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedEdges = edges.filter((e) => e.selected);
  const canUngroup = selectedNodes.some((n) => n.type === 'group');
  const hasSelection = selectedNodes.length > 0 || selectedEdges.length > 0;

  const handleAddNote = () => {
    const rect = document
      .getElementById('topology-canvas')
      ?.getBoundingClientRect();
    if (rect) {
      addNote({ x: rect.width / 2, y: rect.height / 2 });
    }
  };

  return (
    <div
      className="dark:bg-card/90 dark:border-border/50 dark:hover:bg-card absolute top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-gray-200/50 bg-white/90 p-1.5 shadow-xl backdrop-blur-sm transition-all hover:bg-white"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <ActionButton
        icon={Unplug}
        tooltip="Connect [C]"
        variant={connectMode ? 'primary' : 'ghost'}
        className={
          connectMode
            ? 'dark:ring-primary/30 bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200'
            : ''
        }
        onClick={() => {
          setConnectMode(!connectMode);
          setConnectSource(null);
        }}
      />

      <div className="dark:bg-border h-8 w-px bg-gray-200" />

      <ActionButton
        icon={Group}
        tooltip="Group [G]"
        variant="ghost"
        disabled={selectedNodes.length < 2}
        onClick={groupSelected}
      />

      <ActionButton
        icon={Ungroup}
        tooltip="Ungroup [U]"
        variant="ghost"
        disabled={!canUngroup}
        onClick={ungroupSelected}
      />

      <div className="dark:bg-border h-8 w-px bg-gray-200" />

      <ActionButton
        icon={StickyNote}
        tooltip="Note [N]"
        variant="ghost"
        onClick={handleAddNote}
      />

      <div className="dark:bg-border h-8 w-px bg-gray-200" />

      <ActionButton
        icon={Trash2}
        tooltip="Delete [Del]"
        variant="ghost"
        disabled={!hasSelection}
        onClick={() => deleteSelected(deviceMap)}
        className="text-destructive hover:text-destructive/90"
      />
    </div>
  );
}
