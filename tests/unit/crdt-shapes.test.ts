// ─── Unit Tests: Shape Operations & CRDT State ───
import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { CRDT_KEYS, generateId } from '@shared/index';
import type { Shape, PenShape, RectangleShape } from '@shared/index';

describe('CRDT Shape Operations', () => {
  let doc: Y.Doc;
  let shapes: Y.Array<Y.Map<any>>;

  beforeEach(() => {
    doc = new Y.Doc();
    shapes = doc.getArray(CRDT_KEYS.SHAPES);
  });

  it('should add a shape to the CRDT array', () => {
    doc.transact(() => {
      const yShape = new Y.Map<any>();
      yShape.set('id', 'shape-1');
      yShape.set('type', 'rectangle');
      yShape.set('x', 100);
      yShape.set('y', 100);
      yShape.set('width', 200);
      yShape.set('height', 150);
      yShape.set('stroke', '#89b4fa');
      yShape.set('fill', 'transparent');
      yShape.set('strokeWidth', 2);
      shapes.push([yShape]);
    });

    expect(shapes.length).toBe(1);
    expect(shapes.get(0).get('id')).toBe('shape-1');
    expect(shapes.get(0).get('type')).toBe('rectangle');
  });

  it('should update a shape property', () => {
    doc.transact(() => {
      const yShape = new Y.Map<any>();
      yShape.set('id', 'shape-1');
      yShape.set('x', 100);
      shapes.push([yShape]);
    });

    doc.transact(() => {
      shapes.get(0).set('x', 200);
    });

    expect(shapes.get(0).get('x')).toBe(200);
  });

  it('should delete a shape by id', () => {
    doc.transact(() => {
      for (let i = 0; i < 3; i++) {
        const yShape = new Y.Map<any>();
        yShape.set('id', `shape-${i}`);
        shapes.push([yShape]);
      }
    });

    expect(shapes.length).toBe(3);

    doc.transact(() => {
      for (let i = shapes.length - 1; i >= 0; i--) {
        if (shapes.get(i).get('id') === 'shape-1') {
          shapes.delete(i, 1);
        }
      }
    });

    expect(shapes.length).toBe(2);
    expect(shapes.get(0).get('id')).toBe('shape-0');
    expect(shapes.get(1).get('id')).toBe('shape-2');
  });

  it('should handle concurrent shape additions (CRDT merge)', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const shapes1 = doc1.getArray<Y.Map<any>>(CRDT_KEYS.SHAPES);
    const shapes2 = doc2.getArray<Y.Map<any>>(CRDT_KEYS.SHAPES);

    // Sync initial state
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));
    Y.applyUpdate(doc1, Y.encodeStateAsUpdate(doc2));

    // Concurrent additions
    doc1.transact(() => {
      const yShape = new Y.Map<any>();
      yShape.set('id', 'shape-from-client-1');
      yShape.set('type', 'rectangle');
      shapes1.push([yShape]);
    });

    doc2.transact(() => {
      const yShape = new Y.Map<any>();
      yShape.set('id', 'shape-from-client-2');
      yShape.set('type', 'ellipse');
      shapes2.push([yShape]);
    });

    // Merge both directions
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));
    Y.applyUpdate(doc1, Y.encodeStateAsUpdate(doc2));

    // Both docs should have both shapes (CRDT convergence)
    expect(shapes1.length).toBe(2);
    expect(shapes2.length).toBe(2);

    const ids1 = new Set([shapes1.get(0).get('id'), shapes1.get(1).get('id')]);
    const ids2 = new Set([shapes2.get(0).get('id'), shapes2.get(1).get('id')]);

    expect(ids1).toEqual(ids2);
    expect(ids1.has('shape-from-client-1')).toBe(true);
    expect(ids1.has('shape-from-client-2')).toBe(true);
  });

  it('should handle concurrent property updates (last-writer-wins per field)', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const shapes1 = doc1.getArray<Y.Map<any>>(CRDT_KEYS.SHAPES);
    const shapes2 = doc2.getArray<Y.Map<any>>(CRDT_KEYS.SHAPES);

    // Add a shape
    doc1.transact(() => {
      const yShape = new Y.Map<any>();
      yShape.set('id', 'shape-1');
      yShape.set('x', 0);
      yShape.set('y', 0);
      yShape.set('fill', 'blue');
      shapes1.push([yShape]);
    });

    // Sync
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));

    // Concurrent updates to DIFFERENT fields
    doc1.transact(() => {
      shapes1.get(0).set('x', 100); // Client 1 moves x
    });

    doc2.transact(() => {
      shapes2.get(0).set('y', 200); // Client 2 moves y
    });

    // Merge
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));
    Y.applyUpdate(doc1, Y.encodeStateAsUpdate(doc2));

    // Both fields should be updated (no conflict, different keys)
    expect(shapes1.get(0).get('x')).toBe(100);
    expect(shapes1.get(0).get('y')).toBe(200);
    expect(shapes2.get(0).get('x')).toBe(100);
    expect(shapes2.get(0).get('y')).toBe(200);
  });

  it('should support undo/redo via Y.UndoManager', () => {
    const undoManager = new Y.UndoManager(shapes, {
      trackedOrigins: new Set([doc.clientID]),
    });

    doc.transact(() => {
      const yShape = new Y.Map<any>();
      yShape.set('id', 'shape-1');
      shapes.push([yShape]);
    }, doc.clientID);

    expect(shapes.length).toBe(1);

    undoManager.undo();
    expect(shapes.length).toBe(0);

    undoManager.redo();
    expect(shapes.length).toBe(1);
  });

  it('should handle pen shape with points array', () => {
    doc.transact(() => {
      const yShape = new Y.Map<any>();
      yShape.set('id', 'pen-1');
      yShape.set('type', 'pen');
      const yPoints = new Y.Array<number>();
      yPoints.push([10, 20, 30, 40, 50, 60]);
      yShape.set('points', yPoints);
      shapes.push([yShape]);
    });

    const points = shapes.get(0).get('points') as Y.Array<number>;
    expect(points.toArray()).toEqual([10, 20, 30, 40, 50, 60]);

    // Extend the pen stroke
    doc.transact(() => {
      (shapes.get(0).get('points') as Y.Array<number>).push([70, 80]);
    });

    expect((shapes.get(0).get('points') as Y.Array<number>).toArray()).toEqual(
      [10, 20, 30, 40, 50, 60, 70, 80]
    );
  });
});

describe('CRDT Y.Text (Notes)', () => {
  it('should handle concurrent text edits', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const text1 = doc1.getText(CRDT_KEYS.NOTES);
    const text2 = doc2.getText(CRDT_KEYS.NOTES);

    // Initial text
    text1.insert(0, 'Hello World');
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));

    // Concurrent inserts at different positions
    text1.insert(5, ' Beautiful'); // "Hello Beautiful World"
    text2.insert(11, '!');         // "Hello World!"

    // Merge
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));
    Y.applyUpdate(doc1, Y.encodeStateAsUpdate(doc2));

    // Both edits should be present
    expect(text1.toString()).toBe(text2.toString());
    expect(text1.toString()).toContain('Beautiful');
    expect(text1.toString()).toContain('!');
  });
});

describe('CRDT Y.Map (Comments)', () => {
  it('should handle concurrent comment additions', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const comments1 = doc1.getMap(CRDT_KEYS.COMMENTS);
    const comments2 = doc2.getMap(CRDT_KEYS.COMMENTS);

    // Sync
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));

    // Concurrent comments
    comments1.set('c1', { text: 'Comment from user 1', userId: 'u1' });
    comments2.set('c2', { text: 'Comment from user 2', userId: 'u2' });

    // Merge
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));
    Y.applyUpdate(doc1, Y.encodeStateAsUpdate(doc2));

    expect(comments1.size).toBe(2);
    expect(comments2.size).toBe(2);
  });
});

describe('generateId', () => {
  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
