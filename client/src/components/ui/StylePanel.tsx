// ─── Style Panel ───
// Controls for stroke color, fill, stroke width, etc.
import React from 'react';
import { useWhiteboardStore } from '@/store/whiteboardStore';

const COLORS = [
  '#89b4fa', '#f38ba8', '#a6e3a1', '#f9e2af', '#cba6f7',
  '#fab387', '#94e2d5', '#f5c2e7', '#74c7ec', '#eba0ac',
  '#ffffff', '#a6adc8', '#585b70', '#313244', '#1e1e2e',
];

export function StylePanel() {
  const {
    strokeColor, setStrokeColor,
    fillColor, setFillColor,
    strokeWidth, setStrokeWidth,
    selectedShapeIds, activeTool,
  } = useWhiteboardStore();

  const showPanel = activeTool !== 'select' && activeTool !== 'pan' || selectedShapeIds.length > 0;

  if (!showPanel) return null;

  return (
    <div className="fixed top-20 left-4 z-40 panel p-3 w-52 space-y-3 animate-fade-in">
      {/* Stroke Color */}
      <div>
        <label className="text-xs text-surface-400 mb-1 block">Stroke</label>
        <div className="flex flex-wrap gap-1">
          {COLORS.map((c) => (
            <button
              key={`stroke-${c}`}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                borderColor: strokeColor === c ? '#89b4fa' : 'transparent',
              }}
              onClick={() => setStrokeColor(c)}
            />
          ))}
        </div>
      </div>

      {/* Fill Color */}
      <div>
        <label className="text-xs text-surface-400 mb-1 block">Fill</label>
        <div className="flex flex-wrap gap-1">
          <button
            className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 relative"
            style={{
              borderColor: fillColor === 'transparent' ? '#89b4fa' : 'transparent',
              background: 'repeating-conic-gradient(#585b70 0% 25%, transparent 0% 50%) 50% / 8px 8px',
            }}
            onClick={() => setFillColor('transparent')}
            title="Transparent"
          />
          {COLORS.map((c) => (
            <button
              key={`fill-${c}`}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                borderColor: fillColor === c ? '#89b4fa' : 'transparent',
              }}
              onClick={() => setFillColor(c)}
            />
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div>
        <label className="text-xs text-surface-400 mb-1 block">
          Width: {strokeWidth}px
        </label>
        <input
          type="range"
          min="1"
          max="20"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          className="w-full accent-accent"
        />
      </div>
    </div>
  );
}
