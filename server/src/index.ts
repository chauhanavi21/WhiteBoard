// ─── Server Entry Point ───
// WebSocket + HTTP server for collaborative whiteboard
// Uses y-websocket for Yjs document sync and Express for REST API

import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { setupWSConnection, setPersistence } from 'y-websocket/bin/utils';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

import { authRouter } from './routes/auth.js';
import { roomRouter } from './routes/rooms.js';
import { snapshotRouter } from './routes/snapshots.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { InMemoryPersistence } from './services/persistence.js';

dotenv.config({ path: '../.env' });

const PORT = parseInt(process.env.PORT || '3001', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-whiteboard-secret-change-in-production';

// ─── Express App ───
const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimiter);

// REST API routes
app.use('/api/auth', authRouter);
app.use('/api/rooms', roomRouter);
app.use('/api/snapshots', snapshotRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// ─── HTTP + WebSocket Server ───
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Set up persistence for y-websocket (in-memory for MVP, PostgreSQL+S3 in Phase 2)
const persistence = new InMemoryPersistence();
setPersistence(persistence);

// Track connected rooms and clients
const roomClients = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage, doc: { roomId: string; userId?: string }) => {
  const roomId = doc.roomId;
  
  // Track client in room
  if (!roomClients.has(roomId)) {
    roomClients.set(roomId, new Set());
  }
  roomClients.get(roomId)!.add(ws);

  console.log(`[WS] Client connected to room: ${roomId} (${roomClients.get(roomId)!.size} clients)`);

  ws.on('close', () => {
    roomClients.get(roomId)?.delete(ws);
    if (roomClients.get(roomId)?.size === 0) {
      roomClients.delete(roomId);
    }
    console.log(`[WS] Client disconnected from room: ${roomId} (${roomClients.get(roomId)?.size ?? 0} clients)`);
  });

  // Use y-websocket's setupWSConnection for Yjs sync protocol
  setupWSConnection(ws, req, { docName: roomId });
});

// HTTP upgrade handler with auth
server.on('upgrade', (req: http.IncomingMessage, socket, head) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const roomId = url.searchParams.get('room') || url.pathname.split('/').pop() || 'default';
  const token = url.searchParams.get('token');

  // Verify JWT token if provided (optional in dev mode)
  let userId: string | undefined;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = payload.userId;
    } catch (err) {
      console.warn('[WS] Invalid token, allowing anonymous access in dev mode');
    }
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req, { roomId, userId });
  });
});

// ─── Graceful Shutdown ───
const shutdown = () => {
  console.log('\n[Server] Shutting down gracefully...');
  wss.clients.forEach((client) => {
    client.close(1001, 'Server shutting down');
  });
  server.close(() => {
    console.log('[Server] Closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ─── Start ───
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   Collaborative Whiteboard Server               ║
║   HTTP + WebSocket on port ${PORT}                ║
║   REST API: http://localhost:${PORT}/api          ║
║   WebSocket: ws://localhost:${PORT}               ║
╚══════════════════════════════════════════════════╝
  `);
});
