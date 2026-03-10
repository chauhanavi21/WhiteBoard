// ─── Whiteboard Store (Zustand) ───
// Local UI state that is NOT shared via CRDT
// CRDT state is the source of truth; this store holds ephemeral UI state

import { create } from 'zustand';
import type { Shape, ShapeType, UserPresence } from '@shared/index';

export type ToolType = 'select' | 'pan' | ShapeType;

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface WhiteboardState {
  // ─── Tool State ───
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;

  // ─── Selection ───
  selectedShapeIds: string[];
  setSelectedShapeIds: (ids: string[]) => void;
  clearSelection: () => void;

  // ─── Camera / Viewport ───
  camera: Camera;
  setCamera: (camera: Camera) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // ─── Drawing State ───
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;
  currentDrawingPoints: number[];
  setCurrentDrawingPoints: (points: number[]) => void;
  appendDrawingPoint: (x: number, y: number) => void;

  // ─── Style State ───
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  fillColor: string;
  setFillColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;

  // ─── Panels ───
  showNotesPanel: boolean;
  toggleNotesPanel: () => void;
  showDebugPanel: boolean;
  toggleDebugPanel: () => void;
  showLayersPanel: boolean;
  toggleLayersPanel: () => void;
  showCommentsPanel: boolean;
  toggleCommentsPanel: () => void;

  // ─── Collaboration ───
  roomId: string;
  setRoomId: (id: string) => void;
  userId: string;
  setUserId: (id: string) => void;
  userName: string;
  setUserName: (name: string) => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  peers: Map<number, { user: UserPresence }>;
  setPeers: (peers: Map<number, { user: UserPresence }>) => void;

  // ─── Active Layer ───
  activeLayerId: string;
  setActiveLayerId: (id: string) => void;

  // ─── Shapes Cache (derived from CRDT, updated on observe) ───
  shapes: Shape[];
  setShapes: (shapes: Shape[]) => void;
}

export const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
  // Tool
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),

  // Selection
  selectedShapeIds: [],
  setSelectedShapeIds: (ids) => set({ selectedShapeIds: ids }),
  clearSelection: () => set({ selectedShapeIds: [] }),

  // Camera
  camera: { x: 0, y: 0, zoom: 1 },
  setCamera: (camera) => set({ camera }),
  zoomIn: () => set((s) => ({ camera: { ...s.camera, zoom: Math.min(s.camera.zoom * 1.2, 5) } })),
  zoomOut: () => set((s) => ({ camera: { ...s.camera, zoom: Math.max(s.camera.zoom / 1.2, 0.1) } })),
  resetZoom: () => set((s) => ({ camera: { ...s.camera, zoom: 1, x: 0, y: 0 } })),

  // Drawing
  isDrawing: false,
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  currentDrawingPoints: [],
  setCurrentDrawingPoints: (points) => set({ currentDrawingPoints: points }),
  appendDrawingPoint: (x, y) => set((s) => ({
    currentDrawingPoints: [...s.currentDrawingPoints, x, y],
  })),

  // Style
  strokeColor: '#89b4fa',
  setStrokeColor: (color) => set({ strokeColor: color }),
  fillColor: 'transparent',
  setFillColor: (color) => set({ fillColor: color }),
  strokeWidth: 2,
  setStrokeWidth: (width) => set({ strokeWidth: width }),

  // Panels
  showNotesPanel: false,
  toggleNotesPanel: () => set((s) => ({ showNotesPanel: !s.showNotesPanel })),
  showDebugPanel: false,
  toggleDebugPanel: () => set((s) => ({ showDebugPanel: !s.showDebugPanel })),
  showLayersPanel: false,
  toggleLayersPanel: () => set((s) => ({ showLayersPanel: !s.showLayersPanel })),
  showCommentsPanel: false,
  toggleCommentsPanel: () => set((s) => ({ showCommentsPanel: !s.showCommentsPanel })),

  // Collaboration
  roomId: 'default',
  setRoomId: (id) => set({ roomId: id }),
  userId: '',
  setUserId: (id) => set({ userId: id }),
  userName: '',
  setUserName: (name) => set({ userName: name }),
  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),
  peers: new Map(),
  setPeers: (peers) => set({ peers }),

  // Active layer
  activeLayerId: 'layer-default',
  setActiveLayerId: (id) => set({ activeLayerId: id }),

  // Shapes cache
  shapes: [],
  setShapes: (shapes) => set({ shapes }),
}));
