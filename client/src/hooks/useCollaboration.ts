// ─── Hooks: useCollaboration ───
// Manages the lifecycle of the CRDT collaboration session
// Observes CRDT changes and syncs to the Zustand store

import { useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import {
  initCollaboration,
  destroyCollaboration,
  getShapes,
  getCollabState,
  type CollaborationState,
} from '@/lib/collaboration';
import { useWhiteboardStore } from '@/store/whiteboardStore';
import type { UserPresence } from '@shared/index';

export function useCollaboration(roomId: string, userId: string, userName: string) {
  const collabRef = useRef<CollaborationState | null>(null);
  const { setShapes, setIsConnected, setPeers, shapes } = useWhiteboardStore();

  useEffect(() => {
    if (!roomId || !userId) return;

    // Initialize collaboration
    const collab = initCollaboration({
      roomId,
      userId,
      userName,
    });
    collabRef.current = collab;

    // ─── Observe CRDT shapes → Zustand store ───
    const syncShapes = () => {
      const currentShapes = getShapes();
      setShapes(currentShapes);
    };

    collab.shapes.observeDeep(syncShapes);

    // Initial sync
    syncShapes();

    // ─── Observe connection status ───
    if (collab.provider) {
      const statusHandler = (event: { status: string }) => {
        setIsConnected(event.status === 'connected');
      };
      collab.provider.on('status', statusHandler);

      // ─── Observe awareness (peers) ───
      const awarenessHandler = () => {
        const states = collab.awareness.getStates() as Map<number, { user: UserPresence }>;
        // Filter out null/empty states and own client
        const peerMap = new Map<number, { user: UserPresence }>();
        states.forEach((state, clientId) => {
          if (state?.user && clientId !== collab.doc.clientID) {
            peerMap.set(clientId, state as { user: UserPresence });
          }
        });
        setPeers(peerMap);
      };
      collab.awareness.on('change', awarenessHandler);
      awarenessHandler(); // initial
    }

    return () => {
      collab.shapes.unobserveDeep(syncShapes);
      destroyCollaboration();
      collabRef.current = null;
    };
  }, [roomId, userId, userName]);

  return collabRef;
}
