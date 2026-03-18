-- Migration: add user rank field
-- Run this ONCE on production D1 and dev D1.

ALTER TABLE users ADD COLUMN user_rank TEXT;
