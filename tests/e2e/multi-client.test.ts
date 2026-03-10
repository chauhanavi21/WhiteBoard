// ─── E2E Smoke Tests: Multi-Client Collaboration ───
import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { CRDT_KEYS } from '@shared/index';

/**
 * These tests simulate multi-client collaboration scenarios
 * without needing a running WebSocket server. They use Yjs
 * documents directly to verify CRDT behavior.
 * 
 * For full e2e testing with browser automation (Playwright/Cypress),
 * see the e2e-browser/ directory (Phase 2).
 */

describe('Multi-Client Collaboration E2E', () => {
  function createClient(name: string): { doc: Y.Doc; name: string } {
    return { doc: new Y.Doc(), name };
  }

  function syncClients(clients: { doc: Y.Doc }[]): void {
    // Simulate hub-and-spoke sync (like through a server)
    for (let i = 0; i < clients.length; i++) {
      for (let j = 0; j < clients.length; j++) {
        if (i !== j) {
          Y.applyUpdate(
            clients[j].doc,
            Y.encodeStateAsUpdate(clients[i].doc)
          );
        }
      }
    }
  }

  it('should support 5 concurrent clients drawing simultaneously', () => {
    const clients = Array.from({ length: 5 }, (_, i) => createClient(`User ${i + 1}`));

    // Each client adds a shape
    clients.forEach((client, i) => {
      const shapes = client.doc.getArray(CRDT_KEYS.SHAPES);
      client.doc.transact(() => {
        const shape = new Y.Map<any>();
        shape.set('id', `shape-${i}`);
        shape.set('type', 'rectangle');
        shape.set('x', i * 100);
        shape.set('y', i * 50);
        shape.set('createdBy', client.name);
        shapes.push([shape]);
      });
    });

    // Sync all clients
    syncClients(clients);

    // All clients should see all 5 shapes
    clients.forEach((client) => {
      expect(client.doc.getArray(CRDT_KEYS.SHAPES).length).toBe(5);
    });
  });

  it('should handle simultaneous text and draw operations', () => {
    const alice = createClient('Alice');
    const bob = createClient('Bob');

    // Sync initial state
    syncClients([alice, bob]);

    // Alice draws a shape while Bob types notes
    alice.doc.transact(() => {
      const shapes = alice.doc.getArray(CRDT_KEYS.SHAPES);
      const shape = new Y.Map<any>();
      shape.set('id', 'alice-rect');
      shape.set('type', 'rectangle');
      shapes.push([shape]);
    });

    bob.doc.transact(() => {
      const notes = bob.doc.getText(CRDT_KEYS.NOTES);
      notes.insert(0, 'Meeting notes from Bob');
    });

    // Sync
    syncClients([alice, bob]);

    // Both should see shape AND notes
    expect(alice.doc.getArray(CRDT_KEYS.SHAPES).length).toBe(1);
    expect(alice.doc.getText(CRDT_KEYS.NOTES).toString()).toBe('Meeting notes from Bob');
    expect(bob.doc.getArray(CRDT_KEYS.SHAPES).length).toBe(1);
    expect(bob.doc.getText(CRDT_KEYS.NOTES).toString()).toBe('Meeting notes from Bob');
  });

  it('should handle move + resize conflict gracefully', () => {
    const alice = createClient('Alice');
    const bob = createClient('Bob');

    // Create shared shape
    alice.doc.transact(() => {
      const shapes = alice.doc.getArray(CRDT_KEYS.SHAPES);
      const shape = new Y.Map<any>();
      shape.set('id', 'shared-rect');
      shape.set('x', 100);
      shape.set('y', 100);
      shape.set('width', 200);
      shape.set('height', 150);
      shapes.push([shape]);
    });
    syncClients([alice, bob]);

    // Conflict: Alice moves, Bob resizes
    alice.doc.transact(() => {
      alice.doc.getArray(CRDT_KEYS.SHAPES).get(0).set('x', 300);
      alice.doc.getArray(CRDT_KEYS.SHAPES).get(0).set('y', 300);
    });

    bob.doc.transact(() => {
      bob.doc.getArray(CRDT_KEYS.SHAPES).get(0).set('width', 400);
      bob.doc.getArray(CRDT_KEYS.SHAPES).get(0).set('height', 350);
    });

    syncClients([alice, bob]);

    // Both changes should be applied (different fields = no conflict)
    const aliceShape = alice.doc.getArray(CRDT_KEYS.SHAPES).get(0);
    const bobShape = bob.doc.getArray(CRDT_KEYS.SHAPES).get(0);

    expect(aliceShape.get('x')).toBe(300);
    expect(aliceShape.get('width')).toBe(400);
    expect(bobShape.get('x')).toBe(300);
    expect(bobShape.get('width')).toBe(400);
  });

  it('should handle delete + edit conflict', () => {
    const alice = createClient('Alice');
    const bob = createClient('Bob');

    // Create shape
    alice.doc.transact(() => {
      const shapes = alice.doc.getArray(CRDT_KEYS.SHAPES);
      const shape = new Y.Map<any>();
      shape.set('id', 'doomed-shape');
      shape.set('x', 100);
      shapes.push([shape]);
    });
    syncClients([alice, bob]);

    // Alice deletes, Bob edits (before seeing delete)
    alice.doc.transact(() => {
      alice.doc.getArray(CRDT_KEYS.SHAPES).delete(0, 1);
    });

    bob.doc.transact(() => {
      bob.doc.getArray(CRDT_KEYS.SHAPES).get(0).set('x', 500);
    });

    syncClients([alice, bob]);

    // Delete wins in Yjs array semantics — shape is gone
    expect(alice.doc.getArray(CRDT_KEYS.SHAPES).length).toBe(0);
    expect(bob.doc.getArray(CRDT_KEYS.SHAPES).length).toBe(0);
  });

  it('should handle comments as Y.Map entries', () => {
    const alice = createClient('Alice');
    const bob = createClient('Bob');

    syncClients([alice, bob]);

    // Both add comments
    alice.doc.getMap(CRDT_KEYS.COMMENTS).set('thread-1', {
      text: 'What about this area?',
      userId: 'alice',
      x: 200, y: 150,
    });

    bob.doc.getMap(CRDT_KEYS.COMMENTS).set('thread-2', {
      text: 'Looks good!',
      userId: 'bob',
      x: 300, y: 250,
    });

    syncClients([alice, bob]);

    expect(alice.doc.getMap(CRDT_KEYS.COMMENTS).size).toBe(2);
    expect(bob.doc.getMap(CRDT_KEYS.COMMENTS).size).toBe(2);
  });
});
