// ─── In-Memory Persistence for y-websocket (MVP) ───
// Phase 2: Replace with PostgreSQL + S3 persistence
// This stores Yjs document state in memory with optional snapshot support

import * as Y from 'yjs';

interface PersistedDoc {
  updates: Uint8Array[];
  lastAccess: number;
}

const docs = new Map<string, PersistedDoc>();

export class InMemoryPersistence {
  /**
   * Called by y-websocket when a document is loaded.
   * Applies all stored updates to the Yjs document.
   */
  async bindState(docName: string, ydoc: Y.Doc): Promise<void> {
    const persisted = docs.get(docName);
    if (persisted) {
      persisted.updates.forEach((update) => {
        Y.applyUpdate(ydoc, update);
      });
      persisted.lastAccess = Date.now();
      console.log(`[Persistence] Loaded doc "${docName}" (${persisted.updates.length} updates)`);
    }

    // Listen for new updates and store them
    ydoc.on('update', (update: Uint8Array) => {
      if (!docs.has(docName)) {
        docs.set(docName, { updates: [], lastAccess: Date.now() });
      }
      const doc = docs.get(docName)!;
      doc.updates.push(update);
      doc.lastAccess = Date.now();

      // Compact: if too many updates, merge into single state snapshot
      if (doc.updates.length > 100) {
        const tempDoc = new Y.Doc();
        doc.updates.forEach((u) => Y.applyUpdate(tempDoc, u));
        doc.updates = [Y.encodeStateAsUpdate(tempDoc)];
        tempDoc.destroy();
        console.log(`[Persistence] Compacted doc "${docName}"`);
      }
    });
  }

  /**
   * Called by y-websocket when all clients disconnected.
   * We keep the state in memory for later reconnection.
   */
  async writeState(docName: string, _ydoc: Y.Doc): Promise<void> {
    console.log(`[Persistence] Saved state for doc "${docName}"`);
  }
}

// ─── Snapshot Service (for version history) ───
export interface Snapshot {
  id: string;
  roomId: string;
  label: string;
  createdBy: string;
  createdAt: number;
  data: Uint8Array;
}

const snapshots = new Map<string, Snapshot[]>();

export function saveSnapshot(snapshot: Snapshot): void {
  if (!snapshots.has(snapshot.roomId)) {
    snapshots.set(snapshot.roomId, []);
  }
  snapshots.get(snapshot.roomId)!.push(snapshot);
}

export function getSnapshots(roomId: string): Snapshot[] {
  return snapshots.get(roomId) || [];
}

export function getSnapshot(roomId: string, snapshotId: string): Snapshot | undefined {
  return snapshots.get(roomId)?.find((s) => s.id === snapshotId);
}
