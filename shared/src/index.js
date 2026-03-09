// ─── Shared Types for Collaborative Whiteboard ───
// These types define the canonical CRDT document schema and protocol types.
// ─── CRDT Document Schema Keys ───
// These are the top-level keys in the Yjs document
export const CRDT_KEYS = {
    META: 'meta', // Y.Map<DocumentMeta fields>
    SHAPES: 'shapes', // Y.Array<Y.Map<Shape fields>>
    LAYERS: 'layers', // Y.Array<Y.Map<Layer fields>>
    NOTES: 'notes', // Y.Text (rich text)
    COMMENTS: 'comments', // Y.Map<Comment>
};
// ─── User Colors for Presence ───
export const PRESENCE_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F0B27A', '#82E0AA',
];
export function getPresenceColor(index) {
    return PRESENCE_COLORS[index % PRESENCE_COLORS.length];
}
export function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() :
        Math.random().toString(36).substring(2) + Date.now().toString(36);
}
//# sourceMappingURL=index.js.map