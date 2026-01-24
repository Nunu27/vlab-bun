import { useEffect } from 'react';
import { useTopologyStore } from '../stores';

export const useTopologyEffects = () => {
  const store = useTopologyStore();
  const nodes = store.use.nodes();
  const setNodes = store.use.actions().setNodes;
  // Auto-delete empty notes
  useEffect(() => {
    setNodes((prev) => {
      const emptyNotes = prev.filter(
        (n) =>
          n.type === 'note' &&
          !n.selected &&
          (!n.content || n.content.trim() === ''),
      );
      if (emptyNotes.length > 0) {
        return prev.filter((n) => !emptyNotes.includes(n));
      }
      return prev;
    });
  }, [nodes, setNodes]);

  // Sync visual height to state (for notes)
  useEffect(() => {
    const noteNodes = nodes.filter((n) => n.type === 'note');
    let hasUpdates = false;
    const updates = new Map<string, number>();

    noteNodes.forEach((note) => {
      const el = document.getElementById(`node-${note.id}`);
      if (el) {
        const domHeight = el.offsetHeight;
        if (Math.abs(domHeight - note.height) > 2) {
          updates.set(note.id, domHeight);
          hasUpdates = true;
        }
      }
    });

    if (hasUpdates) {
      setNodes((prev) =>
        prev.map((n) => {
          if (updates.has(n.id)) {
            return { ...n, height: updates.get(n.id)! };
          }
          return n;
        }),
      );
    }
  }, [nodes, setNodes]);
};
