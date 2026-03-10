// ─── Remote Cursors Layer ───
// Renders live cursors and selection boxes for all connected peers.
// Uses Awareness state (separate from document state).

import React from 'react';
import { Layer, Group, Line, Text, Rect, Circle } from 'react-konva';
import { useWhiteboardStore } from '@/store/whiteboardStore';
import type { UserPresence } from '@shared/index';

export function CursorsLayer() {
  const peers = useWhiteboardStore((s) => s.peers);

  return (
    <Layer listening={false}>
      {Array.from(peers.entries()).map(([clientId, state]) => {
        const user = state.user;
        if (!user || !user.cursor) return null;

        return (
          <Group key={clientId}>
            {/* Cursor arrow */}
            <Line
              points={[
                user.cursor.x, user.cursor.y,
                user.cursor.x + 2, user.cursor.y + 14,
                user.cursor.x + 6, user.cursor.y + 10,
                user.cursor.x + 12, user.cursor.y + 12,
                user.cursor.x + 8, user.cursor.y + 8,
                user.cursor.x + 14, user.cursor.y + 4,
                user.cursor.x, user.cursor.y,
              ]}
              fill={user.color}
              stroke="#1e1e2e"
              strokeWidth={1}
              closed
            />
            
            {/* Name label */}
            <Group x={user.cursor.x + 16} y={user.cursor.y + 10}>
              <Rect
                x={-2}
                y={-2}
                width={user.userName.length * 7 + 12}
                height={18}
                fill={user.color}
                cornerRadius={4}
              />
              <Text
                x={4}
                y={1}
                text={user.userName}
                fontSize={11}
                fontFamily="Inter"
                fill="#1e1e2e"
                fontStyle="bold"
              />
            </Group>

            {/* Active tool indicator */}
            {user.isTyping && (
              <Text
                x={user.cursor.x + 16}
                y={user.cursor.y + 30}
                text="typing..."
                fontSize={10}
                fill={user.color}
                fontStyle="italic"
              />
            )}
          </Group>
        );
      })}
    </Layer>
  );
}
