// ─── Layers Panel ───
import React from 'react';
import { useWhiteboardStore } from '@/store/whiteboardStore';
import { getLayers, addLayer, getCollabState } from '@/lib/collaboration';
import { X, Eye, EyeOff, Lock, Unlock, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import type { Layer } from '@shared/index';

export function LayersPanel() {
  const showLayersPanel = useWhiteboardStore((s) => s.showLayersPanel);
  const toggleLayersPanel = useWhiteboardStore((s) => s.toggleLayersPanel);
  const activeLayerId = useWhiteboardStore((s) => s.activeLayerId);
  const setActiveLayerId = useWhiteboardStore((s) => s.setActiveLayerId);
  const [layers, setLayers] = useState<Layer[]>([]);

  useEffect(() => {
    if (!showLayersPanel) return;

    const refreshLayers = () => {
      try {
        setLayers(getLayers());
      } catch { /* not initialized */ }
    };

    refreshLayers();
    const interval = setInterval(refreshLayers, 500);
    return () => clearInterval(interval);
  }, [showLayersPanel]);

  if (!showLayersPanel) return null;

  return (
    <div className="fixed right-16 top-48 z-40 w-64 panel animate-slide-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-600/20">
        <h3 className="text-sm font-semibold text-surface-200">Layers</h3>
        <div className="flex items-center gap-1">
          <button
            className="toolbar-btn w-6 h-6"
            onClick={() => {
              const name = `Layer ${layers.length + 1}`;
              const id = addLayer(name);
              setActiveLayerId(id);
            }}
            title="Add Layer"
          >
            <Plus size={14} />
          </button>
          <button className="toolbar-btn w-6 h-6" onClick={toggleLayersPanel}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
              activeLayerId === layer.id ? 'bg-surface-700' : 'hover:bg-surface-700/50'
            )}
            onClick={() => setActiveLayerId(layer.id)}
          >
            <button
              className="text-surface-400 hover:text-surface-200"
              onClick={(e) => {
                e.stopPropagation();
                try {
                  const collab = getCollabState();
                  const yLayers = collab.layers;
                  for (let i = 0; i < yLayers.length; i++) {
                    if (yLayers.get(i).get('id') === layer.id) {
                      yLayers.get(i).set('visible', !layer.visible);
                      break;
                    }
                  }
                } catch {}
              }}
            >
              {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <span className="text-xs text-surface-200 flex-1 truncate">{layer.name}</span>
            {layer.locked && <Lock size={12} className="text-surface-500" />}
          </div>
        ))}
      </div>
    </div>
  );
}
