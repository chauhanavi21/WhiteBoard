// ─── Snapshot / Version History Panel ───
import React, { useState, useCallback, useEffect } from 'react';
import { Camera, History, RotateCcw, Download, X } from 'lucide-react';
import { createDocSnapshot, restoreDocFromSnapshot, getCollabState } from '@/lib/collaboration';

interface LocalSnapshot {
  id: string;
  label: string;
  createdAt: number;
  data: Uint8Array;
  sizeBytes: number;
}

// Store snapshots in memory (also saved to IndexedDB via the main doc persistence)
const localSnapshots: LocalSnapshot[] = [];

export function SnapshotsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>([]);
  const [labelInput, setLabelInput] = useState('');

  const refreshSnapshots = useCallback(() => {
    setSnapshots([...localSnapshots]);
  }, []);

  useEffect(() => {
    if (isOpen) refreshSnapshots();
  }, [isOpen]);

  const handleCreateSnapshot = useCallback(() => {
    try {
      const data = createDocSnapshot();
      const snapshot: LocalSnapshot = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        label: labelInput || `Snapshot ${new Date().toLocaleString()}`,
        createdAt: Date.now(),
        data,
        sizeBytes: data.byteLength,
      };
      localSnapshots.unshift(snapshot);
      setLabelInput('');
      refreshSnapshots();
    } catch (err) {
      console.error('Failed to create snapshot:', err);
    }
  }, [labelInput]);

  const handleRestore = useCallback((snapshot: LocalSnapshot) => {
    if (confirm(`Restore to "${snapshot.label}"? This will overwrite the current document state.`)) {
      restoreDocFromSnapshot(snapshot.data);
    }
  }, []);

  if (!isOpen) {
    return (
      <button
        className="fixed top-4 left-[280px] z-50 panel px-3 py-1.5 flex items-center gap-2 text-xs text-surface-300 hover:text-surface-100 transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <History size={14} />
        Snapshots
      </button>
    );
  }

  return (
    <div className="fixed left-4 top-20 z-40 w-72 max-h-[70vh] panel flex flex-col animate-slide-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-600/20">
        <div className="flex items-center gap-2">
          <History size={14} className="text-accent" />
          <h3 className="text-sm font-semibold text-surface-200">Version History</h3>
        </div>
        <button className="toolbar-btn w-6 h-6" onClick={() => setIsOpen(false)}>
          <X size={14} />
        </button>
      </div>

      {/* Create snapshot */}
      <div className="px-4 py-3 border-b border-surface-600/20">
        <div className="flex gap-2">
          <input
            type="text"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="Snapshot label..."
            className="input-field text-xs flex-1"
          />
          <button
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
            onClick={handleCreateSnapshot}
          >
            <Camera size={12} />
            Save
          </button>
        </div>
      </div>

      {/* Snapshot list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {snapshots.length === 0 && (
          <p className="text-xs text-surface-500 text-center py-4">
            No snapshots yet. Create one to save the current state.
          </p>
        )}
        {snapshots.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-700/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs text-surface-200 truncate">{s.label}</div>
              <div className="text-[10px] text-surface-500">
                {new Date(s.createdAt).toLocaleString()} · {(s.sizeBytes / 1024).toFixed(1)} KB
              </div>
            </div>
            <button
              className="toolbar-btn w-6 h-6 text-surface-400 hover:text-warning"
              onClick={() => handleRestore(s)}
              title="Restore this snapshot"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
