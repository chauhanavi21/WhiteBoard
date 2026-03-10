// ─── Integration Tests: Sync & Offline Merge ───
import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { CRDT_KEYS } from '@shared/index';

describe('Offline Merge Scenarios', () => {
  it('should merge offline changes after reconnection', () => {
    // Simulate 3 clients that go offline and make changes
    const server = new Y.Doc();
    const client1 = new Y.Doc();
    const client2 = new Y.Doc();
    const client3 = new Y.Doc();

    const serverShapes = server.getArray(CRDT_KEYS.SHAPES);
    const c1Shapes = client1.getArray(CRDT_KEYS.SHAPES);
    const c2Shapes = client2.getArray(CRDT_KEYS.SHAPES);
    const c3Shapes = client3.getArray(CRDT_KEYS.SHAPES);

    // Initial state: all synced with server
    const initialShape = new Y.Map<any>();
    serverShapes.push([initialShape]);
    initialShape.set('id', 'initial');
    initialShape.set('x', 0);

    const initialUpdate = Y.encodeStateAsUpdate(server);
    Y.applyUpdate(client1, initialUpdate);
    Y.applyUpdate(client2, initialUpdate);
    Y.applyUpdate(client3, initialUpdate);

    // ─── Go Offline: Each client makes changes independently ───

    // Client 1: Adds a rectangle
    client1.transact(() => {
      const shape = new Y.Map<any>();
      shape.set('id', 'c1-rect');
      shape.set('type', 'rectangle');
      shape.set('x', 100);
      c1Shapes.push([shape]);
    });

    // Client 2: Adds an ellipse and modifies the initial shape
    client2.transact(() => {
      const shape = new Y.Map<any>();
      shape.set('id', 'c2-ellipse');
      shape.set('type', 'ellipse');
      shape.set('x', 200);
      c2Shapes.push([shape]);
      c2Shapes.get(0).set('x', 50); // Move initial shape
    });

    // Client 3: Adds a text shape
    client3.transact(() => {
      const shape = new Y.Map<any>();
      shape.set('id', 'c3-text');
      shape.set('type', 'text');
      shape.set('x', 300);
      c3Shapes.push([shape]);
    });

    // ─── Come Back Online: Sync all changes via server ───

    // Client 1 reconnects first
    Y.applyUpdate(server, Y.encodeStateAsUpdate(client1));
    Y.applyUpdate(client1, Y.encodeStateAsUpdate(server));

    // Client 2 reconnects
    Y.applyUpdate(server, Y.encodeStateAsUpdate(client2));
    Y.applyUpdate(client2, Y.encodeStateAsUpdate(server));
    // Re-sync client1 with new server state
    Y.applyUpdate(client1, Y.encodeStateAsUpdate(server));

    // Client 3 reconnects
    Y.applyUpdate(server, Y.encodeStateAsUpdate(client3));
    Y.applyUpdate(client3, Y.encodeStateAsUpdate(server));
    // Re-sync all
    Y.applyUpdate(client1, Y.encodeStateAsUpdate(server));
    Y.applyUpdate(client2, Y.encodeStateAsUpdate(server));

    // ─── Verify Convergence ───

    // All should have 4 shapes (initial + 3 adds)
    expect(serverShapes.length).toBe(4);
    expect(c1Shapes.length).toBe(4);
    expect(c2Shapes.length).toBe(4);
    expect(c3Shapes.length).toBe(4);

    // Collect and compare IDs
    const getIds = (shapes: Y.Array<Y.Map<any>>) => {
      const ids: string[] = [];
      for (let i = 0; i < shapes.length; i++) {
        ids.push(shapes.get(i).get('id'));
      }
      return ids.sort();
    };

    const expectedIds = ['initial', 'c1-rect', 'c2-ellipse', 'c3-text'].sort();
    expect(getIds(serverShapes)).toEqual(expectedIds);
    expect(getIds(c1Shapes)).toEqual(expectedIds);
    expect(getIds(c2Shapes)).toEqual(expectedIds);
    expect(getIds(c3Shapes)).toEqual(expectedIds);
  });

  it('should handle state vector diff for efficient sync', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const shapes1 = doc1.getArray(CRDT_KEYS.SHAPES);

    // doc1 makes many changes
    for (let i = 0; i < 50; i++) {
      doc1.transact(() => {
        const shape = new Y.Map<any>();
        shape.set('id', `shape-${i}`);
        shapes1.push([shape]);
      });
    }

    // Do initial full sync
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));
    expect(doc2.getArray(CRDT_KEYS.SHAPES).length).toBe(50);

    // doc1 makes 5 more changes
    for (let i = 50; i < 55; i++) {
      doc1.transact(() => {
        const shape = new Y.Map<any>();
        shape.set('id', `shape-${i}`);
        shapes1.push([shape]);
      });
    }

    // Use state vector diff for efficient sync
    const stateVector2 = Y.encodeStateVector(doc2);
    const diffUpdate = Y.encodeStateAsUpdate(doc1, stateVector2);

    // The diff should be much smaller than the full state
    const fullUpdate = Y.encodeStateAsUpdate(doc1);
    expect(diffUpdate.byteLength).toBeLessThan(fullUpdate.byteLength);

    // Apply diff
    Y.applyUpdate(doc2, diffUpdate);
    expect(doc2.getArray(CRDT_KEYS.SHAPES).length).toBe(55);
  });

  it('should handle snapshot + restore correctly', () => {
    const doc = new Y.Doc();
    const shapes = doc.getArray(CRDT_KEYS.SHAPES);

    // Add shapes
    doc.transact(() => {
      const shape = new Y.Map<any>();
      shape.set('id', 'shape-1');
      shape.set('x', 100);
      shapes.push([shape]);
    });

    // Take snapshot
    const snapshot = Y.encodeStateAsUpdate(doc);

    // Make more changes
    doc.transact(() => {
      const shape = new Y.Map<any>();
      shape.set('id', 'shape-2');
      shapes.push([shape]);
    });
    expect(shapes.length).toBe(2);

    // Restore snapshot into a new doc
    const restoredDoc = new Y.Doc();
    Y.applyUpdate(restoredDoc, snapshot);

    const restoredShapes = restoredDoc.getArray(CRDT_KEYS.SHAPES);
    expect(restoredShapes.length).toBe(1);
    expect(restoredShapes.get(0).get('id')).toBe('shape-1');
  });
});

describe('Crash Recovery', () => {
  it('should recover from partial update application', () => {
    const doc = new Y.Doc();
    const shapes = doc.getArray(CRDT_KEYS.SHAPES);

    // Simulate stored updates (as IndexedDB would have)
    const updates: Uint8Array[] = [];

    const unsubscribe = doc.on('update', (update: Uint8Array) => {
      updates.push(new Uint8Array(update)); // Clone
    });

    // Make changes
    for (let i = 0; i < 10; i++) {
      doc.transact(() => {
        const shape = new Y.Map<any>();
        shape.set('id', `shape-${i}`);
        shapes.push([shape]);
      });
    }

    expect(updates.length).toBe(10);

    // Simulate crash recovery: create new doc and replay updates
    const recoveredDoc = new Y.Doc();
    updates.forEach((update) => {
      Y.applyUpdate(recoveredDoc, update);
    });

    const recoveredShapes = recoveredDoc.getArray(CRDT_KEYS.SHAPES);
    expect(recoveredShapes.length).toBe(10);
  });
});
