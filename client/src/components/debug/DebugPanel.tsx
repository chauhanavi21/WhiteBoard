// ─── Debug / Telemetry Panel ───
// Shows sync status, peer count, update rate, simulated latency/packet loss toggles.

import React, { useEffect, useState, useCallback } from 'react';
import { useWhiteboardStore } from '@/store/whiteboardStore';
import { getCollabState, createDocSnapshot } from '@/lib/collaboration';
import { X, Wifi, WifiOff, Activity, Clock, Users, Database, Zap } from 'lucide-react';
import type { SyncTelemetry } from '@shared/index';

export function DebugPanel() {
  const showDebugPanel = useWhiteboardStore((s) => s.showDebugPanel);
  const toggleDebugPanel = useWhiteboardStore((s) => s.toggleDebugPanel);
  const isConnected = useWhiteboardStore((s) => s.isConnected);
  const peers = useWhiteboardStore((s) => s.peers);
  const shapes = useWhiteboardStore((s) => s.shapes);

  const [telemetry, setTelemetry] = useState<SyncTelemetry>({
    peerCount: 0,
    pendingUpdates: 0,
    lastSyncTimestamp: 0,
    updateRate: 0,
    connectionState: 'disconnected',
    simulatedLatencyMs: 0,
    simulatedPacketLoss: 0,
  });

  const [updateCount, setUpdateCount] = useState(0);
  const [docSize, setDocSize] = useState(0);

  useEffect(() => {
    if (!showDebugPanel) return;

    const interval = setInterval(() => {
      try {
        const collab = getCollabState();
        const snapshot = createDocSnapshot();
        
        setTelemetry({
          peerCount: peers.size,
          pendingUpdates: 0, // Would track from provider's pending queue
          lastSyncTimestamp: Date.now(),
          updateRate: updateCount,
          connectionState: isConnected ? 'connected' : 'disconnected',
          simulatedLatencyMs: telemetry.simulatedLatencyMs,
          simulatedPacketLoss: telemetry.simulatedPacketLoss,
        });
        setDocSize(snapshot.byteLength);
        setUpdateCount(0);
      } catch { /* not initialized */ }
    }, 1000);

    // Count updates
    let collab: ReturnType<typeof getCollabState> | null = null;
    try {
      collab = getCollabState();
      collab.doc.on('update', () => setUpdateCount((c) => c + 1));
    } catch { /* not initialized */ }

    return () => {
      clearInterval(interval);
    };
  }, [showDebugPanel, isConnected, peers.size]);

  if (!showDebugPanel) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 panel animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-600/20">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-accent" />
          <h3 className="text-sm font-semibold text-surface-200">Debug Panel</h3>
        </div>
        <button className="toolbar-btn w-6 h-6" onClick={toggleDebugPanel}>
          <X size={14} />
        </button>
      </div>

      {/* Telemetry Grid */}
      <div className="p-4 space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? <Wifi size={14} className="text-success" /> : <WifiOff size={14} className="text-danger" />}
            <span className="text-xs text-surface-400">Connection</span>
          </div>
          <span className={`text-xs font-mono ${isConnected ? 'text-success' : 'text-danger'}`}>
            {telemetry.connectionState}
          </span>
        </div>

        {/* Peer Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-surface-400" />
            <span className="text-xs text-surface-400">Peers</span>
          </div>
          <span className="text-xs font-mono text-surface-200">{telemetry.peerCount}</span>
        </div>

        {/* Shape Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-surface-400" />
            <span className="text-xs text-surface-400">Shapes</span>
          </div>
          <span className="text-xs font-mono text-surface-200">{shapes.length}</span>
        </div>

        {/* Doc Size */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-surface-400" />
            <span className="text-xs text-surface-400">Doc Size</span>
          </div>
          <span className="text-xs font-mono text-surface-200">
            {(docSize / 1024).toFixed(1)} KB
          </span>
        </div>

        {/* Update Rate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-surface-400" />
            <span className="text-xs text-surface-400">Updates/sec</span>
          </div>
          <span className="text-xs font-mono text-surface-200">{telemetry.updateRate}</span>
        </div>

        {/* Last Sync */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-surface-400" />
            <span className="text-xs text-surface-400">Last Sync</span>
          </div>
          <span className="text-xs font-mono text-surface-200">
            {telemetry.lastSyncTimestamp ? new Date(telemetry.lastSyncTimestamp).toLocaleTimeString() : 'never'}
          </span>
        </div>

        <div className="w-full h-px bg-surface-600/20" />

        {/* Simulated Latency */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-surface-400">Sim. Latency</span>
            <span className="text-xs font-mono text-warning">{telemetry.simulatedLatencyMs}ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="2000"
            step="50"
            value={telemetry.simulatedLatencyMs}
            onChange={(e) => setTelemetry({ ...telemetry, simulatedLatencyMs: Number(e.target.value) })}
            className="w-full accent-warning"
          />
        </div>

        {/* Simulated Packet Loss */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-surface-400">Sim. Packet Loss</span>
            <span className="text-xs font-mono text-danger">{(telemetry.simulatedPacketLoss * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={telemetry.simulatedPacketLoss}
            onChange={(e) => setTelemetry({ ...telemetry, simulatedPacketLoss: Number(e.target.value) })}
            className="w-full accent-danger"
          />
        </div>

        {/* CRDT Info */}
        <div className="mt-2 p-2 bg-surface-700/50 rounded-lg">
          <p className="text-[10px] text-surface-500 font-mono leading-relaxed">
            CRDT: Yjs v13 | Encoding: lib0<br />
            Sync: y-websocket (WebSocket)<br />
            Persistence: IndexedDB (local-first)<br />
            Conflict Resolution: Automatic (CRDT)<br />
            Undo: Y.UndoManager (per-client tracked)
          </p>
        </div>
      </div>
    </div>
  );
}
