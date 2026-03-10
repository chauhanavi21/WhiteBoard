// ─── Notes Editor ───
// Rich text notes editor bound to Y.Text in the same CRDT document.
// Changes are automatically synced across all collaborators.

import React, { useEffect, useRef, useCallback } from 'react';
import { useWhiteboardStore } from '@/store/whiteboardStore';
import { getCollabState } from '@/lib/collaboration';
import { X } from 'lucide-react';

export function NotesEditor() {
  const showNotesPanel = useWhiteboardStore((s) => s.showNotesPanel);
  const toggleNotesPanel = useWhiteboardStore((s) => s.toggleNotesPanel);
  const editorRef = useRef<HTMLDivElement>(null);
  const isLocalChange = useRef(false);

  useEffect(() => {
    if (!showNotesPanel) return;

    let collab: ReturnType<typeof getCollabState>;
    try {
      collab = getCollabState();
    } catch {
      return;
    }

    const yText = collab.notes;
    const editor = editorRef.current;
    if (!editor) return;

    // Initialize editor with current Y.Text content
    editor.textContent = yText.toString();

    // Observe Y.Text changes from remote peers
    const observer = (event: any) => {
      if (isLocalChange.current) return; // Skip if we caused the change
      
      // Preserve cursor position
      const sel = window.getSelection();
      const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
      const cursorOffset = range ? range.startOffset : 0;

      editor.textContent = yText.toString();

      // Restore cursor
      if (range && editor.firstChild) {
        try {
          const newRange = document.createRange();
          const node = editor.firstChild || editor;
          const offset = Math.min(cursorOffset, (node.textContent?.length || 0));
          newRange.setStart(node, offset);
          newRange.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(newRange);
        } catch { /* cursor restoration failed, user can re-click */ }
      }
    };

    yText.observe(observer);

    return () => {
      yText.unobserve(observer);
    };
  }, [showNotesPanel]);

  const handleInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    let collab: ReturnType<typeof getCollabState>;
    try {
      collab = getCollabState();
    } catch {
      return;
    }

    const yText = collab.notes;
    const newText = editor.textContent || '';
    const oldText = yText.toString();

    if (newText === oldText) return;

    isLocalChange.current = true;
    collab.doc.transact(() => {
      yText.delete(0, oldText.length);
      yText.insert(0, newText);
    });
    isLocalChange.current = false;
  }, []);

  if (!showNotesPanel) return null;

  return (
    <div className="fixed right-16 top-4 z-40 w-80 max-h-[calc(100vh-2rem)] panel flex flex-col animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-600/20">
        <h3 className="text-sm font-semibold text-surface-200">Notes</h3>
        <button
          className="toolbar-btn w-6 h-6"
          onClick={toggleNotesPanel}
        >
          <X size={14} />
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="flex-1 p-4 text-sm text-surface-200 leading-relaxed 
                   outline-none overflow-y-auto min-h-[200px] max-h-[60vh]
                   whitespace-pre-wrap break-words
                   placeholder:text-surface-500"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        data-placeholder="Start typing notes..."
      />

      {/* Footer */}
      <div className="px-4 py-2 border-t border-surface-600/20">
        <p className="text-xs text-surface-500">
          Notes are synced via CRDT (Y.Text) — all collaborators see changes in real-time.
        </p>
      </div>
    </div>
  );
}
