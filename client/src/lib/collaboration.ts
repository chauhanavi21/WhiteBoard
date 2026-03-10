// ─── Yjs CRDT Document Manager ───
// Canonical collaborative document using Yjs shared types.
// Strict separation: document state (Y.Doc) vs awareness/presence (Awareness).

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Awareness } from 'y-protocols/awareness';
import type { Shape, Layer, Comment, DocumentMeta, UserPresence } from '@shared/index';
import { CRDT_KEYS, generateId, getPresenceColor } from '@shared/index';

export interface CollaborationConfig {
  roomId: string;
  userId: string;
  userName: string;
  wsUrl?: string;
  token?: string;
}

export interface CollaborationState {
  doc: Y.Doc;
  provider: WebsocketProvider | null;
  indexedDb: IndexeddbPersistence | null;
  awareness: Awareness;
  shapes: Y.Array<Y.Map<any>>;
  layers: Y.Array<Y.Map<any>>;
  notes: Y.Text;
  comments: Y.Map<any>;
  meta: Y.Map<any>;
}

let state: CollaborationState | null = null;

/**
 * Initialize or get the collaborative CRDT document for a room.
 * Sets up:
 *  1. Y.Doc with canonical shared types
 *  2. IndexedDB persistence (local-first)
 *  3. WebSocket provider (network sync)
 *  4. Awareness (presence/cursors)
 */
export function initCollaboration(config: CollaborationConfig): CollaborationState {
  if (state && state.doc) {
    // Already initialized — return existing state
    return state;
  }

  const doc = new Y.Doc();

  // ─── Shared Types (Document State) ───
  const shapes = doc.getArray<Y.Map<any>>(CRDT_KEYS.SHAPES);
  const layers = doc.getArray<Y.Map<any>>(CRDT_KEYS.LAYERS);
  const notes = doc.getText(CRDT_KEYS.NOTES);
  const comments = doc.getMap<any>(CRDT_KEYS.COMMENTS);
  const meta = doc.getMap<any>(CRDT_KEYS.META);

  // Initialize metadata if empty
  if (!meta.has('id')) {
    doc.transact(() => {
      meta.set('id', config.roomId);
      meta.set('title', 'Untitled Whiteboard');
      meta.set('createdAt', Date.now());
      meta.set('updatedAt', Date.now());
      meta.set('ownerId', config.userId);
      meta.set('version', 1);
    });
  }

  // Initialize default layer if empty
  if (layers.length === 0) {
    doc.transact(() => {
      const defaultLayer = new Y.Map<any>();
      defaultLayer.set('id', 'layer-default');
      defaultLayer.set('name', 'Layer 1');
      defaultLayer.set('visible', true);
      defaultLayer.set('locked', false);
      defaultLayer.set('opacity', 1);
      defaultLayer.set('order', 0);
      layers.push([defaultLayer]);
    });
  }

  // ─── IndexedDB Persistence (Local-First) ───
  let indexedDb: IndexeddbPersistence | null = null;
  try {
    indexedDb = new IndexeddbPersistence(`whiteboard-${config.roomId}`, doc);
    indexedDb.on('synced', () => {
      console.log(`[CRDT] IndexedDB synced for room: ${config.roomId}`);
    });
  } catch (err) {
    console.warn('[CRDT] IndexedDB not available, operating in memory only', err);
  }

  // ─── WebSocket Provider (Network Sync) ───
  const wsUrl = config.wsUrl || `ws://${window.location.hostname}:3001`;
  let provider: WebsocketProvider | null = null;

  try {
    const params: Record<string, string> = { room: config.roomId };
    if (config.token) {
      params.token = config.token;
    }

    provider = new WebsocketProvider(wsUrl, config.roomId, doc, {
      connect: true,
      params,
      // Reconnect with exponential backoff
      maxBackoffTime: 10000,
    });

    provider.on('status', (event: { status: string }) => {
      console.log(`[CRDT] WebSocket status: ${event.status}`);
    });

    provider.on('connection-error', (event: Event) => {
      console.warn('[CRDT] WebSocket connection error', event);
    });

    // ─── Awareness (Presence State — separate from document state) ───
    const awareness = provider.awareness;
    
    const colorIndex = Math.floor(Math.random() * 12);
    awareness.setLocalStateField('user', {
      userId: config.userId,
      userName: config.userName,
      color: getPresenceColor(colorIndex),
      cursor: null,
      selectedShapeIds: [],
      activeTool: 'select',
      isTyping: false,
      lastActive: Date.now(),
    } satisfies UserPresence);

    state = { doc, provider, indexedDb, awareness, shapes, layers, notes, comments, meta };
  } catch (err) {
    console.warn('[CRDT] WebSocket not available, operating offline', err);
    // Create a local-only awareness
    const awareness = new Awareness(doc);
    const colorIndex = Math.floor(Math.random() * 12);
    awareness.setLocalStateField('user', {
      userId: config.userId,
      userName: config.userName,
      color: getPresenceColor(colorIndex),
      cursor: null,
      selectedShapeIds: [],
      activeTool: 'select',
      isTyping: false,
      lastActive: Date.now(),
    } satisfies UserPresence);

    state = { doc, provider: null, indexedDb, awareness, shapes, layers, notes, comments, meta };
  }

  return state;
}

/**
 * Get current collaboration state (throws if not initialized)
 */
export function getCollabState(): CollaborationState {
  if (!state) {
    throw new Error('[CRDT] Collaboration not initialized. Call initCollaboration first.');
  }
  return state;
}

/**
 * Destroy the collaboration session and clean up resources
 */
export function destroyCollaboration(): void {
  if (state) {
    state.provider?.disconnect();
    state.provider?.destroy();
    state.indexedDb?.destroy();
    state.awareness.destroy();
    state.doc.destroy();
    state = null;
  }
}

// ─── Shape Operations (transactional CRDT ops) ───

export function addShape(shape: Shape): void {
  const { shapes, doc } = getCollabState();
  doc.transact(() => {
    const yShape = new Y.Map<any>();
    for (const [key, value] of Object.entries(shape)) {
      if (key === 'points' && Array.isArray(value)) {
        const yArr = new Y.Array<number>();
        yArr.push(value);
        yShape.set(key, yArr);
      } else {
        yShape.set(key, value);
      }
    }
    shapes.push([yShape]);
  });
}

export function updateShape(shapeId: string, updates: Partial<Shape>): void {
  const { shapes, doc } = getCollabState();
  doc.transact(() => {
    for (let i = 0; i < shapes.length; i++) {
      const yShape = shapes.get(i);
      if (yShape.get('id') === shapeId) {
        for (const [key, value] of Object.entries(updates)) {
          if (key === 'points' && Array.isArray(value)) {
            const existing = yShape.get('points');
            if (existing instanceof Y.Array) {
              existing.delete(0, existing.length);
              existing.push(value);
            } else {
              const yArr = new Y.Array<number>();
              yArr.push(value);
              yShape.set(key, yArr);
            }
          } else {
            yShape.set(key, value);
          }
        }
        yShape.set('updatedAt', Date.now());
        break;
      }
    }
  });
}

export function deleteShape(shapeId: string): void {
  const { shapes, doc } = getCollabState();
  doc.transact(() => {
    for (let i = 0; i < shapes.length; i++) {
      if (shapes.get(i).get('id') === shapeId) {
        shapes.delete(i, 1);
        break;
      }
    }
  });
}

export function deleteShapes(shapeIds: string[]): void {
  const { shapes, doc } = getCollabState();
  const idSet = new Set(shapeIds);
  doc.transact(() => {
    // Delete from end to front to avoid index shifting
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (idSet.has(shapes.get(i).get('id'))) {
        shapes.delete(i, 1);
      }
    }
  });
}

/**
 * Read all shapes from CRDT state as plain objects
 */
export function getShapes(): Shape[] {
  const { shapes } = getCollabState();
  const result: Shape[] = [];
  for (let i = 0; i < shapes.length; i++) {
    result.push(yMapToShape(shapes.get(i)));
  }
  return result;
}

function yMapToShape(yMap: Y.Map<any>): Shape {
  const obj: Record<string, any> = {};
  yMap.forEach((value, key) => {
    if (value instanceof Y.Array) {
      obj[key] = value.toArray();
    } else if (value instanceof Y.Map) {
      obj[key] = value.toJSON();
    } else {
      obj[key] = value;
    }
  });
  return obj as Shape;
}

// ─── Layer Operations ───

export function addLayer(name: string): string {
  const { layers, doc } = getCollabState();
  const id = `layer-${generateId()}`;
  doc.transact(() => {
    const yLayer = new Y.Map<any>();
    yLayer.set('id', id);
    yLayer.set('name', name);
    yLayer.set('visible', true);
    yLayer.set('locked', false);
    yLayer.set('opacity', 1);
    yLayer.set('order', layers.length);
    layers.push([yLayer]);
  });
  return id;
}

export function getLayers(): Layer[] {
  const { layers } = getCollabState();
  const result: Layer[] = [];
  for (let i = 0; i < layers.length; i++) {
    result.push(layers.get(i).toJSON() as Layer);
  }
  return result.sort((a, b) => a.order - b.order);
}

// ─── Comment Operations ───

export function addComment(comment: Omit<Comment, 'id' | 'replies'>): string {
  const { comments, doc } = getCollabState();
  const id = generateId();
  doc.transact(() => {
    const yComment = new Y.Map<any>();
    yComment.set('id', id);
    yComment.set('threadId', id);
    Object.entries(comment).forEach(([key, value]) => yComment.set(key, value));
    yComment.set('replies', new Y.Array());
    comments.set(id, yComment);
  });
  return id;
}

// ─── Undo/Redo Management ───
let undoManager: Y.UndoManager | null = null;

export function getUndoManager(): Y.UndoManager {
  if (!undoManager) {
    const { shapes, doc } = getCollabState();
    undoManager = new Y.UndoManager(shapes, {
      trackedOrigins: new Set([doc.clientID]),
      captureTimeout: 300,
    });
  }
  return undoManager;
}

export function undo(): void {
  getUndoManager().undo();
}

export function redo(): void {
  getUndoManager().redo();
}

// ─── Presence Helpers ───

export function updateCursor(x: number, y: number): void {
  const { awareness } = getCollabState();
  const localState = awareness.getLocalState();
  if (localState?.user) {
    awareness.setLocalStateField('user', {
      ...localState.user,
      cursor: { x, y },
      lastActive: Date.now(),
    });
  }
}

export function updateSelection(shapeIds: string[]): void {
  const { awareness } = getCollabState();
  const localState = awareness.getLocalState();
  if (localState?.user) {
    awareness.setLocalStateField('user', {
      ...localState.user,
      selectedShapeIds: shapeIds,
      lastActive: Date.now(),
    });
  }
}

export function updateActiveTool(tool: string): void {
  const { awareness } = getCollabState();
  const localState = awareness.getLocalState();
  if (localState?.user) {
    awareness.setLocalStateField('user', {
      ...localState.user,
      activeTool: tool,
      lastActive: Date.now(),
    });
  }
}

export function getPresenceStates(): Map<number, { user: UserPresence }> {
  const { awareness } = getCollabState();
  return awareness.getStates() as Map<number, { user: UserPresence }>;
}

// ─── Snapshot Helpers ───

export function createDocSnapshot(): Uint8Array {
  const { doc } = getCollabState();
  return Y.encodeStateAsUpdate(doc);
}

export function restoreDocFromSnapshot(snapshotData: Uint8Array): void {
  const { doc } = getCollabState();
  doc.transact(() => {
    Y.applyUpdate(doc, snapshotData);
  });
}
