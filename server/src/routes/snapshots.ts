// ─── Snapshot Routes (Version History) ───
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { saveSnapshot, getSnapshots, getSnapshot } from '../services/persistence.js';

export const snapshotRouter = Router();

// List snapshots for a room
snapshotRouter.get('/:roomId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const snapshots = getSnapshots(req.params.roomId);
  // Don't send the full data blob in listing
  const listing = snapshots.map(s => ({
    id: s.id,
    roomId: s.roomId,
    label: s.label,
    createdBy: s.createdBy,
    createdAt: s.createdAt,
    sizeBytes: s.data.byteLength,
  }));
  res.json({ success: true, data: listing });
});

// Create snapshot
snapshotRouter.post('/:roomId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { label, data } = req.body;
    if (!data) {
      res.status(400).json({ error: 'Snapshot data required' });
      return;
    }

    const snapshot = {
      id: uuidv4(),
      roomId: req.params.roomId,
      label: label || `Snapshot ${new Date().toISOString()}`,
      createdBy: req.user!.userId,
      createdAt: Date.now(),
      data: Buffer.from(data, 'base64'),
    };

    saveSnapshot(snapshot);
    res.status(201).json({
      success: true,
      data: { id: snapshot.id, label: snapshot.label, createdAt: snapshot.createdAt },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save snapshot' });
  }
});

// Get snapshot data (for restore)
snapshotRouter.get('/:roomId/:snapshotId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const snapshot = getSnapshot(req.params.roomId, req.params.snapshotId);
  if (!snapshot) {
    res.status(404).json({ error: 'Snapshot not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      id: snapshot.id,
      label: snapshot.label,
      createdAt: snapshot.createdAt,
      data: Buffer.from(snapshot.data).toString('base64'),
    },
  });
});
