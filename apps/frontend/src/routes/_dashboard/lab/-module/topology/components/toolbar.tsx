import React from 'react';
import { Unplug, Group, Ungroup, StickyNote, Trash2 } from 'lucide-react';
import { useTopologyStore } from '../hook';

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  icon: React.ElementType;
  label: string;
  shortcut: string;
  color?: string;
  activeColor?: string;
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  icon: Icon,
  label,
  shortcut,
  color = 'text-gray-600 dark:text-muted-foreground',
  activeColor = 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200 dark:ring-primary/30',
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex items-center justify-center rounded-xl p-2 transition-all ${
        isActive
          ? activeColor
          : `${color} dark:hover:bg-accent hover:bg-gray-100`
      } ${disabled ? 'cursor-not-allowed opacity-40 hover:bg-transparent' : ''}`}
    >
      <Icon size={20} />
      {!disabled && (
        <div className="dark:bg-popover dark:text-popover-foreground dark:border-border pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-[10px] font-medium whitespace-nowrap text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
          {label}{' '}
          <span className="dark:text-muted-foreground ml-1 font-mono text-gray-400">
            [{shortcut}]
          </span>
          <div className="dark:bg-popover dark:border-border absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-t border-l border-gray-700 bg-gray-900" />
        </div>
      )}
    </button>
  );
}

export default function Toolbar({
  deviceMap,
}: {
  deviceMap: Map<
    string,
    { interfaces: { displayCode: string; internalCode: string }[] }
  >;
}) {
  const store = useTopologyStore();

  const nodes = store.use.nodes();
  const edges = store.use.edges();
  const connectMode = store.use.connectMode();
  const connectSource = store.use.connectSource();
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
    // We need the center of the canvas, but we don't have the rect here easily.
    // We can pass a dummy center or try to get it from the store if we stored the canvas rect.
    // For now, let's assume the parent or store handles the "center" calculation or we pass it.
    // Actually, the original code used canvasRef.current.getBoundingClientRect().
    // I'll dispatch an action that might need the rect, but here I can't get it easily without ref.
    // Maybe I should move the keydown listener and this toolbar logic to where the canvas ref is available,
    // OR store the canvas dimensions in the store.

    // Let's try to get the center of the window as a fallback if we can't get the canvas rect.
    // Or better, let's just use a fixed position relative to view for now, or fix it in the store.
    // The store's addNote expects a center position (screen coordinates).

    const rect = document
      .getElementById('topology-canvas')
      ?.getBoundingClientRect();
    if (rect) {
      addNote({ x: rect.width / 2, y: rect.height / 2 });
    }
  };

  return (
    <div
      className="dark:bg-card/90 dark:border-border/50 dark:hover:bg-card absolute top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-gray-200/50 bg-white/90 p-1.5 shadow-xl backdrop-blur-sm transition-all hover:bg-white"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <ToolbarButton
        onClick={() => {
          setConnectMode(!connectMode);
          setConnectSource(null);
        }}
        isActive={connectMode}
        icon={Unplug}
        label={
          connectMode
            ? connectSource
              ? 'Select Target'
              : 'Select Source'
            : 'Connect'
        }
        shortcut="C"
      />

      <div className="dark:bg-border mx-1 h-6 w-px bg-gray-200"></div>

      <ToolbarButton
        onClick={groupSelected}
        disabled={selectedNodes.length < 2}
        icon={Group}
        label="Group Selected"
        shortcut="G"
      />

      <ToolbarButton
        onClick={ungroupSelected}
        disabled={!canUngroup}
        icon={Ungroup}
        label="Ungroup"
        shortcut="U"
      />

      <div className="dark:bg-border mx-1 h-6 w-px bg-gray-200"></div>

      <ToolbarButton
        onClick={handleAddNote}
        icon={StickyNote}
        label="Add Note"
        shortcut="N"
      />

      <div className="dark:bg-border mx-1 h-6 w-px bg-gray-200"></div>

      <ToolbarButton
        onClick={() => deleteSelected(deviceMap)}
        disabled={!hasSelection}
        icon={Trash2}
        label="Delete"
        shortcut="Del"
        color="text-red-500 dark:text-red-400"
        activeColor="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
      />
    </div>
  );
}
