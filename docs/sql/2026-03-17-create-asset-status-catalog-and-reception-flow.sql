-- Migration: configurable asset statuses + legacy normalization
-- Run this ONCE on production D1 and dev D1.

CREATE TABLE IF NOT EXISTS asset_status_catalog (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO asset_status_catalog (code, label, is_default, is_active, sort_order)
VALUES
  ('en_uso', 'En uso', 1, 1, 10),
  ('disponible', 'Disponible', 0, 1, 20),
  ('solicitado', 'Solicitado', 0, 1, 30),
  ('pendiente_recepcion', 'Pendiente de aceptar recepcion', 0, 1, 40),
  ('mantenimiento', 'Mantenimiento', 0, 1, 50),
  ('baja', 'Baja', 0, 1, 60);

UPDATE asset_status_catalog
SET is_default = CASE WHEN code = 'en_uso' THEN 1 ELSE 0 END;

UPDATE assets SET status = 'en_uso' WHERE status = 'bajo_responsabilidad';
UPDATE assets SET status = 'mantenimiento' WHERE status = 'en_reparacion';

CREATE INDEX IF NOT EXISTS idx_asset_status_catalog_active_sort
  ON asset_status_catalog (is_active, sort_order);