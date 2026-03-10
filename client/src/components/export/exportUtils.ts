// ─── Export Functions ───
// Export whiteboard as PNG, SVG, or JSON

import Konva from 'konva';
import { getShapes, getLayers, getCollabState, createDocSnapshot } from '@/lib/collaboration';

/**
 * Export the canvas as a PNG image
 */
export function exportAsPNG(stage: Konva.Stage): void {
  const dataURL = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
  downloadFile(dataURL, 'whiteboard.png');
}

/**
 * Export shapes as SVG
 */
export function exportAsSVG(): void {
  const shapes = getShapes();
  const layers = getLayers();

  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  shapes.forEach((s) => {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + s.width);
    maxY = Math.max(maxY, s.y + s.height);
  });

  const padding = 20;
  const width = (maxX - minX) + padding * 2 || 800;
  const height = (maxY - minY) + padding * 2 || 600;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX - padding} ${minY - padding} ${width} ${height}">
  <rect x="${minX - padding}" y="${minY - padding}" width="${width}" height="${height}" fill="#1e1e2e"/>
`;

  shapes.forEach((shape) => {
    switch (shape.type) {
      case 'rectangle':
        svg += `  <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${shape.fill === 'transparent' ? 'none' : shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" rx="${shape.borderRadius || 0}"/>
`;
        break;
      case 'ellipse':
        svg += `  <ellipse cx="${shape.x + shape.width / 2}" cy="${shape.y + shape.height / 2}" rx="${shape.width / 2}" ry="${shape.height / 2}" fill="${shape.fill === 'transparent' ? 'none' : shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"/>
`;
        break;
      case 'pen':
      case 'line': {
        const pts = shape.points;
        if (pts.length >= 4) {
          let d = `M${pts[0]},${pts[1]}`;
          for (let i = 2; i < pts.length; i += 2) {
            d += ` L${pts[i]},${pts[i + 1]}`;
          }
          svg += `  <path d="${d}" fill="none" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
`;
        }
        break;
      }
      case 'text':
        svg += `  <text x="${shape.x}" y="${shape.y + shape.fontSize}" font-size="${shape.fontSize}" font-family="${shape.fontFamily}" fill="${shape.stroke}">${escapeXml(shape.text)}</text>
`;
        break;
      case 'sticky-note':
        svg += `  <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${shape.noteColor}" rx="4"/>
  <text x="${shape.x + 8}" y="${shape.y + 20}" font-size="${shape.fontSize}" font-family="Inter" fill="#1e1e2e">${escapeXml(shape.text)}</text>
`;
        break;
    }
  });

  svg += '</svg>';
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  downloadFile(URL.createObjectURL(blob), 'whiteboard.svg');
}

/**
 * Export document as JSON (shapes + metadata, portable format)
 */
export function exportAsJSON(): void {
  const shapes = getShapes();
  const layers = getLayers();
  const collab = getCollabState();

  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    roomId: collab.meta.get('id'),
    title: collab.meta.get('title'),
    shapes,
    layers,
    notes: collab.notes.toString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadFile(URL.createObjectURL(blob), 'whiteboard.json');
}

/**
 * Export the raw CRDT document state (for backup/restore)
 */
export function exportCRDTState(): void {
  const snapshot = createDocSnapshot();
  const blob = new Blob([snapshot as BlobPart], { type: 'application/octet-stream' });
  downloadFile(URL.createObjectURL(blob), 'whiteboard-crdt.bin');
}

// ─── Helpers ───

function downloadFile(href: string, filename: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (href.startsWith('blob:')) URL.revokeObjectURL(href);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
