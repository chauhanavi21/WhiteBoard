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
    points: number[];
    roughness: number;
}
export interface LineShape extends BaseShape {
    type: 'line';
    points: [number, number, number, number];
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
    startBinding?: string;
    endBinding?: string;
}
export type Shape = PenShape | LineShape | RectangleShape | EllipseShape | TextShape | StickyNoteShape | ArrowShape;
export interface Layer {
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    opacity: number;
    order: number;
}
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
export interface DocumentMeta {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    ownerId: string;
    version: number;
}
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
export interface VersionSnapshot {
    id: string;
    roomId: string;
    version: number;
    label: string;
    createdBy: string;
    createdAt: number;
    sizeBytes: number;
    storageKey: string;
}
export interface AuthPayload {
    userId: string;
    userName: string;
    email: string;
    iat: number;
    exp: number;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface SyncTelemetry {
    peerCount: number;
    pendingUpdates: number;
    lastSyncTimestamp: number;
    updateRate: number;
    connectionState: 'connected' | 'connecting' | 'disconnected';
    simulatedLatencyMs: number;
    simulatedPacketLoss: number;
}
export interface EncryptionMeta {
    algorithm: 'AES-GCM';
    keyDerivation: 'PBKDF2';
    salt: string;
    iv: string;
}
export declare const CRDT_KEYS: {
    readonly META: "meta";
    readonly SHAPES: "shapes";
    readonly LAYERS: "layers";
    readonly NOTES: "notes";
    readonly COMMENTS: "comments";
};
export declare const PRESENCE_COLORS: readonly ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9", "#F0B27A", "#82E0AA"];
export declare function getPresenceColor(index: number): string;
export declare function generateId(): string;
//# sourceMappingURL=index.d.ts.map