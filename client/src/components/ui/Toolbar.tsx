// ─── Toolbar Component ───
import React from 'react';
import { clsx } from 'clsx';
import {
  MousePointer2, Hand, Pencil, Minus, Square, Circle,
  Type, StickyNote, ArrowUpRight, Undo2, Redo2,
  ZoomIn, ZoomOut, Maximize2, FileText, Bug,
  Layers, MessageSquare, Download, Camera, Share2
} from 'lucide-react';
import { useWhiteboardStore, type ToolType } from '@/store/whiteboardStore';
import { undo, redo, createDocSnapshot } from '@/lib/collaboration';

interface ToolButton {
  tool: ToolType;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}

const tools: ToolButton[] = [
  { tool: 'select', icon: <MousePointer2 size={18} />, label: 'Select', shortcut: 'V' },
  { tool: 'pan', icon: <Hand size={18} />, label: 'Pan', shortcut: 'H' },
  { tool: 'pen', icon: <Pencil size={18} />, label: 'Pen', shortcut: 'P' },
  { tool: 'line', icon: <Minus size={18} />, label: 'Line', shortcut: 'L' },
  { tool: 'rectangle', icon: <Square size={18} />, label: 'Rectangle', shortcut: 'R' },
  { tool: 'ellipse', icon: <Circle size={18} />, label: 'Ellipse', shortcut: 'O' },
  { tool: 'text', icon: <Type size={18} />, label: 'Text', shortcut: 'T' },
  { tool: 'sticky-note', icon: <StickyNote size={18} />, label: 'Sticky Note', shortcut: 'S' },
  { tool: 'arrow', icon: <ArrowUpRight size={18} />, label: 'Arrow', shortcut: 'A' },
];

export function Toolbar() {
  const {
    activeTool, setActiveTool,
    zoomIn, zoomOut, resetZoom,
    camera,
    toggleNotesPanel, toggleDebugPanel,
    toggleLayersPanel, toggleCommentsPanel,
    showNotesPanel, showDebugPanel, showLayersPanel, showCommentsPanel,
  } = useWhiteboardStore();

  return (
    <>
      {/* Main Tool Bar — Top Center */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 panel px-2 py-1.5">
        {tools.map((t) => (
          <button
            key={t.tool}
            className={clsx('toolbar-btn', activeTool === t.tool && 'active')}
            onClick={() => setActiveTool(t.tool)}
            title={`${t.label} (${t.shortcut})`}
          >
            {t.icon}
          </button>
        ))}

        <div className="w-px h-6 bg-surface-600/30 mx-1" />

        <button className="toolbar-btn" onClick={undo} title="Undo (Ctrl+Z)">
          <Undo2 size={18} />
        </button>
        <button className="toolbar-btn" onClick={redo} title="Redo (Ctrl+Y)">
          <Redo2 size={18} />
        </button>
      </div>

      {/* Zoom Controls — Bottom Left */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-1 panel px-2 py-1.5">
        <button className="toolbar-btn" onClick={zoomOut} title="Zoom Out">
          <ZoomOut size={18} />
        </button>
        <span className="text-xs text-surface-400 w-12 text-center font-mono">
          {Math.round(camera.zoom * 100)}%
        </span>
        <button className="toolbar-btn" onClick={zoomIn} title="Zoom In">
          <ZoomIn size={18} />
        </button>
        <button className="toolbar-btn" onClick={resetZoom} title="Reset Zoom">
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Right Panel Toggles — Right Side */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-1 panel px-1.5 py-2">
        <button
          className={clsx('toolbar-btn', showNotesPanel && 'active')}
          onClick={toggleNotesPanel}
          title="Notes (Ctrl+N)"
        >
          <FileText size={18} />
        </button>
        <button
          className={clsx('toolbar-btn', showLayersPanel && 'active')}
          onClick={toggleLayersPanel}
          title="Layers"
        >
          <Layers size={18} />
        </button>
        <button
          className={clsx('toolbar-btn', showCommentsPanel && 'active')}
          onClick={toggleCommentsPanel}
          title="Comments"
        >
          <MessageSquare size={18} />
        </button>
        <div className="w-6 h-px bg-surface-600/30 mx-auto" />
        <button
          className={clsx('toolbar-btn', showDebugPanel && 'active')}
          onClick={toggleDebugPanel}
          title="Debug Panel (Ctrl+D)"
        >
          <Bug size={18} />
        </button>
      </div>
    </>
  );
}
