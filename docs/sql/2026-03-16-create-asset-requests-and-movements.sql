-- Migration: asset requests + asset movement history
-- Run this ONCE on production D1 and dev D1.

CREATE TABLE IF NOT EXISTS asset_requests (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  requester_user_id TEXT NOT NULL,
  current_holder_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP,
  responded_by_user_id TEXT,
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (requester_user_id) REFERENCES users(id),
  FOREIGN KEY (current_holder_user_id) REFERENCES users(id),
  FOREIGN KEY (responded_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS asset_movements (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  from_user_id TEXT,
  to_user_id TEXT,
  request_id TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id),
  FOREIGN KEY (request_id) REFERENCES asset_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_asset_requests_asset_status
  ON asset_requests (asset_id, status);

CREATE INDEX IF NOT EXISTS idx_asset_requests_holder_status
  ON asset_requests (current_holder_user_id, status);

CREATE INDEX IF NOT EXISTS idx_asset_movements_asset_created
  ON asset_movements (asset_id, created_at DESC);