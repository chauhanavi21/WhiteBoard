// ─── Shared Types for Collaborative Whiteboard ───
// These types define the canonical CRDT document schema and protocol types.

// ─── Shape Types ───
export type ShapeType = 'pen' | 'line' | 'rectangle' | 'ellipse' | 'text' | 'sticky-note' | 'arrow';

export interface Point {
  x: number;
  y: number;
}

export interface BaseShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  layerId: string;
  locked: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface PenShape extends BaseShape {
  type: 'pen';
  points: number[]; // flat [x1,y1,x2,y2,...]
  roughness: number;
}

export interface LineShape extends BaseShape {
  type: 'line';
  points: [number, number, number, number]; // [x1,y1,x2,y2]
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  borderRadius: number;
  roughness: number;
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse';
  roughness: number;
}

export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
}

export interface StickyNoteShape extends BaseShape {
  type: 'sticky-note';
  text: string;
  fontSize: number;
  noteColor: string;
}

export interface ArrowShape extends BaseShape {
  type: 'arrow';
  points: [number, number, number, number];
  startBinding?: string; // connected shape id
  endBinding?: string;
}

export type Shape = PenShape | LineShape | RectangleShape | EllipseShape | TextShape | StickyNoteShape | ArrowShape;

// ─── Layer ───
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  order: number;
}

// ─── Comment / Thread ───
export interface Comment {
  id: string;
  threadId: string;
  userId: string;
  userName: string;
  text: string;
  x: number;
  y: number;
  createdAt: number;
  resolved: boolean;
  replies: CommentReply[];
}

export interface CommentReply {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
}

// ─── Document Metadata ───
export interface DocumentMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  ownerId: string;
  version: number;
}

// ─── Awareness / Presence ───
export interface UserPresence {
  userId: string;
  userName: string;
  color: string;
  cursor: Point | null;
  selectedShapeIds: string[];
  activeTool: string;
  isTyping: boolean;
  lastActive: number;
}

// ─── Room / Permissions ───
export type RoomRole = 'owner' | 'editor' | 'viewer';

export interface RoomPermission {
  userId: string;
  role: RoomRole;
}

export interface Room {
  id: string;
  name: string;
  createdAt: number;
  ownerId: string;
  isEncrypted: boolean;
  permissions: RoomPermission[];
}

// ─── Version Snapshot ───
export interface VersionSnapshot {
  id: string;
  roomId: string;
  version: number;
  label: string;
  createdBy: string;
  createdAt: number;
  sizeBytes: number;
  // The actual Yjs state vector / update blob is stored in S3 or IndexedDB
  storageKey: string;
}

// ─── Auth ───
export interface AuthPayload {
  userId: string;
  userName: string;
  email: string;
  iat: number;
  exp: number;
}

// ─── API ───
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Sync Telemetry ───
export interface SyncTelemetry {
  peerCount: number;
  pendingUpdates: number;
  lastSyncTimestamp: number;
  updateRate: number; // updates/sec
  connectionState: 'connected' | 'connecting' | 'disconnected';
  simulatedLatencyMs: number;
  simulatedPacketLoss: number; // 0-1
}

// ─── Encryption ───
export interface EncryptionMeta {
  algorithm: 'AES-GCM';
  keyDerivation: 'PBKDF2';
  salt: string; // base64
  iv: string;   // base64
}

// ─── CRDT Document Schema Keys ───
// These are the top-level keys in the Yjs document
export const CRDT_KEYS = {
  META: 'meta',           // Y.Map<DocumentMeta fields>
  SHAPES: 'shapes',       // Y.Array<Y.Map<Shape fields>>
  LAYERS: 'layers',       // Y.Array<Y.Map<Layer fields>>
  NOTES: 'notes',         // Y.Text (rich text)
  COMMENTS: 'comments',   // Y.Map<Comment>
} as const;

// ─── User Colors for Presence ───
export const PRESENCE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F0B27A', '#82E0AA',
] as const;

export function getPresenceColor(index: number): string {
  return PRESENCE_COLORS[index % PRESENCE_COLORS.length];
}

export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : 
    Math.random().toString(36).substring(2) + Date.now().toString(36);
}
