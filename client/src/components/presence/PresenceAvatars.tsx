// ─── Presence Avatars ───
// Shows connected collaborators with their colors and names

import React from 'react';
import { useWhiteboardStore } from '@/store/whiteboardStore';

export function PresenceAvatars() {
  const peers = useWhiteboardStore((s) => s.peers);
  const userName = useWhiteboardStore((s) => s.userName);
  const isConnected = useWhiteboardStore((s) => s.isConnected);

  const peerList = Array.from(peers.values()).filter((p) => p.user);

  return (
    <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
      {/* Connection status */}
      <div className="panel px-3 py-1.5 flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-danger'} animate-pulse`}
        />
        <span className="text-xs text-surface-400">
          {isConnected ? 'Connected' : 'Offline'}
        </span>
      </div>

      {/* Current user */}
      <div className="panel px-3 py-1.5 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
          <span className="text-xs font-bold text-surface-900">
            {userName.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-xs text-surface-300">{userName} (you)</span>
      </div>

      {/* Remote peers */}
      {peerList.length > 0 && (
        <div className="panel px-2 py-1.5 flex items-center gap-1">
          {peerList.slice(0, 5).map((peer, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full flex items-center justify-center -ml-1 first:ml-0 ring-2 ring-surface-800"
              style={{ backgroundColor: peer.user.color }}
              title={peer.user.userName}
            >
              <span className="text-xs font-bold text-surface-900">
                {peer.user.userName.charAt(0).toUpperCase()}
              </span>
            </div>
          ))}
          {peerList.length > 5 && (
            <span className="text-xs text-surface-400 ml-1">
              +{peerList.length - 5}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
