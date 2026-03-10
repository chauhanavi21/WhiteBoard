// ─── Hook: useKeyboardShortcuts ───
import { useEffect } from 'react';
import { useWhiteboardStore } from '@/store/whiteboardStore';
import { undo, redo, deleteShapes } from '@/lib/collaboration';

export function useKeyboardShortcuts() {
  const {
    activeTool,
    setActiveTool,
    selectedShapeIds,
    clearSelection,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleNotesPanel,
    toggleDebugPanel,
    toggleLayersPanel,
  } = useWhiteboardStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      // Undo/Redo
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      // Delete selected shapes
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapeIds.length > 0) {
        e.preventDefault();
        deleteShapes(selectedShapeIds);
        clearSelection();
        return;
      }

      // Tool shortcuts
      switch (e.key.toLowerCase()) {
        case 'v': case '1': setActiveTool('select'); break;
        case 'h': case '2': setActiveTool('pan'); break;
        case 'p': case '3': setActiveTool('pen'); break;
        case 'l': case '4': setActiveTool('line'); break;
        case 'r': case '5': setActiveTool('rectangle'); break;
        case 'o': case '6': setActiveTool('ellipse'); break;
        case 't': case '7': setActiveTool('text'); break;
        case 's':
          if (!ctrl) setActiveTool('sticky-note');
          break;
        case 'escape':
          clearSelection();
          setActiveTool('select');
          break;
      }

      // Zoom
      if (ctrl && e.key === '=') { e.preventDefault(); zoomIn(); }
      if (ctrl && e.key === '-') { e.preventDefault(); zoomOut(); }
      if (ctrl && e.key === '0') { e.preventDefault(); resetZoom(); }

      // Panel toggles
      if (ctrl && e.key === 'n') { e.preventDefault(); toggleNotesPanel(); }
      if (ctrl && e.key === 'd') { e.preventDefault(); toggleDebugPanel(); }
      if (ctrl && e.key === 'l') { e.preventDefault(); toggleLayersPanel(); }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedShapeIds]);
}
