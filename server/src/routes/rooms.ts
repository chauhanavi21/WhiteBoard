// ─── Room Routes ───
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import type { Room, RoomRole } from '../../../shared/src/index.js';

// In-memory room store (Phase 2: PostgreSQL)
const rooms = new Map<string, Room>();

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  isEncrypted: z.boolean().optional().default(false),
});

export const roomRouter = Router();

// List rooms for current user
roomRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const userRooms: Room[] = [];
  
  for (const room of rooms.values()) {
    if (room.ownerId === userId || room.permissions.some(p => p.userId === userId)) {
      userRooms.push(room);
    }
  }

  // If no rooms exist, include the default room
  if (userRooms.length === 0 && !rooms.has('default')) {
    const defaultRoom: Room = {
      id: 'default',
      name: 'Default Whiteboard',
      createdAt: Date.now(),
      ownerId: userId,
      isEncrypted: false,
      permissions: [{ userId, role: 'owner' }],
    };
    rooms.set('default', defaultRoom);
    userRooms.push(defaultRoom);
  }

  res.json({ success: true, data: userRooms });
});

// Create room
roomRouter.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, isEncrypted } = createRoomSchema.parse(req.body);
    const userId = req.user!.userId;

    const room: Room = {
      id: uuidv4(),
      name,
      createdAt: Date.now(),
      ownerId: userId,
      isEncrypted,
      permissions: [{ userId, role: 'owner' }],
    };

    rooms.set(room.id, room);
    res.status(201).json({ success: true, data: room });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get room
roomRouter.get('/:roomId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json({ success: true, data: room });
});

// Update room permissions
roomRouter.post('/:roomId/permissions', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  if (room.ownerId !== req.user!.userId) {
    res.status(403).json({ error: 'Only the owner can modify permissions' });
    return;
  }

  const { userId, role } = req.body as { userId: string; role: RoomRole };
  if (!userId || !['owner', 'editor', 'viewer'].includes(role)) {
    res.status(400).json({ error: 'Invalid userId or role' });
    return;
  }

  const existing = room.permissions.find(p => p.userId === userId);
  if (existing) {
    existing.role = role;
  } else {
    room.permissions.push({ userId, role });
  }

  res.json({ success: true, data: room });
});

// Generate shareable link (returns room ID to construct URL client-side)
roomRouter.post('/:roomId/share', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  // For MVP, the share link just uses the room ID
  // Phase 2: Generate a signed, expiring share token
  res.json({
    success: true,
    data: { roomId: room.id, shareUrl: `/room/${room.id}` },
  });
});
