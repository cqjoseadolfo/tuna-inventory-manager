-- Migration: separate asset creator from current holder and persist request read state
-- Run this ONCE on production D1 and dev D1.

ALTER TABLE assets ADD COLUMN holder_user_id TEXT;

UPDATE assets
SET holder_user_id = created_by_user_id
WHERE holder_user_id IS NULL;

ALTER TABLE asset_requests ADD COLUMN holder_read_at TIMESTAMP;
ALTER TABLE asset_requests ADD COLUMN requester_read_at TIMESTAMP;

UPDATE asset_requests
SET requester_read_at = created_at
WHERE requester_read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assets_holder_user_id
  ON assets (holder_user_id);

CREATE INDEX IF NOT EXISTS idx_asset_requests_requester_status
  ON asset_requests (requester_user_id, status);