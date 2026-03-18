-- Migration: Remove old status CHECK constraint and allow new status values
-- This fix enables the new asset status system (asset_status_catalog)
-- The old CHECK constraint restricted status to: ('disponible', 'bajo_responsabilidad', 'solicitado', 'mantenimiento')
-- We need to allow: ('en_uso', 'disponible', 'solicitado', 'pendiente_recepcion', 'mantenimiento', 'baja')

-- SQLite doesn't support DROP CONSTRAINT directly, so we recreate the table without the old CHECK constraint
-- First, save existing data
CREATE TABLE assets_backup AS SELECT * FROM assets;

-- Drop the old table with the problematic CHECK constraint
DROP TABLE IF EXISTS assets;

-- Recreate the table WITHOUT the obsolete CHECK constraint
CREATE TABLE assets (
    id TEXT PRIMARY KEY,
    asset_type TEXT NOT NULL,
    name TEXT NOT NULL,
    photo_url TEXT,
    fabrication_year INTEGER,
    current_value REAL,
    status TEXT NOT NULL DEFAULT 'en_uso',
    notes TEXT,
    holder_user_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (holder_user_id) REFERENCES users(id)
);

-- Restore data from backup
INSERT INTO assets SELECT * FROM assets_backup;

-- Drop backup table
DROP TABLE assets_backup;

-- Recreate indexes that may have existed
CREATE INDEX IF NOT EXISTS idx_assets_holder ON assets(holder_user_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_created ON assets(created_at);
