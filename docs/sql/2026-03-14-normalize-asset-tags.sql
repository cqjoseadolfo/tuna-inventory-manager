-- Migration: normalize asset_tags into a global tag catalog
-- Run this ONCE on production D1 and dev D1.

-- 1. Global tag catalog: one row per unique tag string
CREATE TABLE IF NOT EXISTS tags (
  id   TEXT PRIMARY KEY,
  tag  TEXT NOT NULL UNIQUE
);

-- 2. Junction table: many-to-many between assets and tags
CREATE TABLE IF NOT EXISTS asset_tag_map (
  asset_id TEXT NOT NULL,
  tag_id   TEXT NOT NULL,
  PRIMARY KEY (asset_id, tag_id),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (tag_id)   REFERENCES tags(id)
);

-- 3. Back-fill: migrate existing asset_tags rows into the new tables
--    Insert unique tag strings into `tags` (ignore duplicates)
INSERT OR IGNORE INTO tags (id, tag)
SELECT DISTINCT id, tag FROM asset_tags;

--    Then populate asset_tag_map from the old table
INSERT OR IGNORE INTO asset_tag_map (asset_id, tag_id)
SELECT at.asset_id, t.id
FROM asset_tags at
JOIN tags t ON LOWER(t.tag) = LOWER(at.tag);

-- 4. (Optional — run only after verifying the migration above)
--    DROP TABLE asset_tags;
