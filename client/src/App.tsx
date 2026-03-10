// ─── App Component ───
// Root layout: Auth → Whiteboard + Notes + Panels

import React, { useState, useCallback, useEffect } from 'react';
import { WhiteboardCanvas } from '@/components/whiteboard/WhiteboardCanvas';
import { Toolbar } from '@/components/ui/Toolbar';
import { StylePanel } from '@/components/ui/StylePanel';
import { LayersPanel } from '@/components/ui/LayersPanel';
import { NotesEditor } from '@/components/notes/NotesEditor';
import { DebugPanel } from '@/components/debug/DebugPanel';
import { PresenceAvatars } from '@/components/presence/PresenceAvatars';
import { ExportMenu } from '@/components/export/ExportMenu';
import { SnapshotsPanel } from '@/components/snapshots/SnapshotsPanel';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { useCollaboration } from '@/hooks/useCollaboration';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useWhiteboardStore } from '@/store/whiteboardStore';

function WhiteboardApp() {
  const roomId = useWhiteboardStore((s) => s.roomId);
  const userId = useWhiteboardStore((s) => s.userId);
  const userName = useWhiteboardStore((s) => s.userName);

  // Initialize CRDT collaboration
  useCollaboration(roomId, userId, userName);
  
  // Keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="w-screen h-screen overflow-hidden bg-surface-900 relative">
      {/* Canvas (full screen) */}
      <WhiteboardCanvas />

      {/* UI Overlays */}
      <PresenceAvatars />
      <Toolbar />
      <StylePanel />
      <LayersPanel />
      <NotesEditor />
      <DebugPanel />
      <ExportMenu />
      <SnapshotsPanel />
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const setUserId = useWhiteboardStore((s) => s.setUserId);
  const setUserName = useWhiteboardStore((s) => s.setUserName);
  const setRoomId = useWhiteboardStore((s) => s.setRoomId);

  // Check for existing session
  useEffect(() => {
    const stored = localStorage.getItem('wb-user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (user.id && user.userName) {
          setUserId(user.id);
          setUserName(user.userName);
          setAuthenticated(true);
        }
      } catch { /* invalid stored data */ }
    }

    // Check for room ID in URL
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room') || window.location.pathname.split('/room/')[1];
    if (room) {
      setRoomId(room);
    }
  }, []);

  const handleAuth = useCallback((userId: string, userName: string, _token: string) => {
    setUserId(userId);
    setUserName(userName);
    setAuthenticated(true);
  }, []);

  if (!authenticated) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  return <WhiteboardApp />;
}
