// ─── Export Menu Component ───
import React, { useState } from 'react';
import { Download, Image, FileCode, FileJson, Database, X } from 'lucide-react';
import { exportAsSVG, exportAsJSON, exportCRDTState } from './exportUtils';

export function ExportMenu() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 panel px-4 py-2 flex items-center gap-2 text-xs text-surface-300 hover:text-surface-100 transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <Download size={14} />
        Export
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 panel p-3 w-64 animate-slide-up">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-surface-200">Export</span>
        <button className="toolbar-btn w-5 h-5" onClick={() => setIsOpen(false)}>
          <X size={12} />
        </button>
      </div>
      <div className="space-y-1">
        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-surface-300 hover:text-surface-100 hover:bg-surface-700 rounded-lg transition-colors"
          onClick={() => {
            // PNG export needs canvas stage ref — triggered from parent
            // For now, export SVG instead
            exportAsSVG();
            setIsOpen(false);
          }}
        >
          <Image size={14} />
          Export as SVG
        </button>
        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-surface-300 hover:text-surface-100 hover:bg-surface-700 rounded-lg transition-colors"
          onClick={() => { exportAsJSON(); setIsOpen(false); }}
        >
          <FileJson size={14} />
          Export as JSON
        </button>
        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-surface-300 hover:text-surface-100 hover:bg-surface-700 rounded-lg transition-colors"
          onClick={() => { exportCRDTState(); setIsOpen(false); }}
        >
          <Database size={14} />
          Export CRDT State (backup)
        </button>
      </div>
    </div>
  );
}
