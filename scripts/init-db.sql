-- ─── Database Schema for Collaborative Whiteboard ───
-- Phase 2: PostgreSQL for room metadata, permissions, audit events, snapshot index.

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL,
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room Permissions
CREATE TABLE IF NOT EXISTS room_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Snapshots (index only — blob data in S3)
CREATE TABLE IF NOT EXISTS snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    label VARCHAR(255),
    version INTEGER NOT NULL DEFAULT 1,
    storage_key VARCHAR(500) NOT NULL,  -- S3 object key
    size_bytes BIGINT DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Events
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    user_id UUID,
    event_type VARCHAR(50) NOT NULL,  -- 'room.create', 'room.join', 'snapshot.create', etc.
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_room_permissions_room ON room_permissions(room_id);
CREATE INDEX IF NOT EXISTS idx_room_permissions_user ON room_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_room ON snapshots(room_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_room ON audit_events(room_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_user ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at);
