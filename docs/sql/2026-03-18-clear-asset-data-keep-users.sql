-- Clear asset domain data while preserving users and login activity
-- Keeps users/login_logs intact.

PRAGMA foreign_keys = OFF;

DELETE FROM asset_field_edit_logs;
DELETE FROM asset_movements;
DELETE FROM asset_requests;
DELETE FROM asset_tag_map;
DELETE FROM asset_tags;
DELETE FROM asset_instruments;
DELETE FROM asset_recognitions;
DELETE FROM asset_uniforms;
DELETE FROM assets;
DELETE FROM tags;

PRAGMA foreign_keys = ON;
