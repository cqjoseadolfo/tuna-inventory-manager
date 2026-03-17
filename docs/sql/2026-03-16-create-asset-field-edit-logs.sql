-- Migration: historical logs for asset field edits
-- Run this ONCE on production D1 and dev D1.

CREATE TABLE IF NOT EXISTS asset_field_edit_logs (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  edited_by_user_id TEXT NOT NULL,
  edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (edited_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_asset_field_edit_logs_asset_time
  ON asset_field_edit_logs (asset_id, edited_at DESC);

CREATE INDEX IF NOT EXISTS idx_asset_field_edit_logs_editor_time
  ON asset_field_edit_logs (edited_by_user_id, edited_at DESC);