-- Migration: remove legacy CHECK on assets.status with minimum changes.
-- Keeps table name as assets and preserves current columns used by the app.

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS assets_backup;
CREATE TABLE assets_backup AS SELECT * FROM assets;

DROP TABLE assets;

CREATE TABLE assets (
    id TEXT PRIMARY KEY,
    asset_type TEXT NOT NULL CHECK (
        asset_type IN ('instrumento', 'reconocimiento', 'uniforme', 'otro')
    ),
    name TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    current_value REAL NOT NULL DEFAULT 0 CHECK (current_value >= 0),
    status TEXT NOT NULL DEFAULT 'en_uso',
    notes TEXT,
    created_by_user_id TEXT,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    fabrication_year INTEGER,
    holder_user_id TEXT
);

INSERT INTO assets (
    id,
    asset_type,
    name,
    photo_url,
    current_value,
    status,
    notes,
    created_by_user_id,
    created_at,
    updated_at,
    fabrication_year,
    holder_user_id
)
SELECT
    id,
    asset_type,
    name,
    photo_url,
    COALESCE(current_value, 0),
    CASE
        WHEN status = 'bajo_responsabilidad' THEN 'en_uso'
        WHEN status = 'en_reparacion' THEN 'mantenimiento'
        ELSE status
    END,
    notes,
    created_by_user_id,
    created_at,
    updated_at,
    fabrication_year,
    holder_user_id
FROM assets_backup;

DROP TABLE assets_backup;

CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);
CREATE INDEX IF NOT EXISTS idx_assets_holder_user_id ON assets(holder_user_id);

PRAGMA foreign_keys = ON;
