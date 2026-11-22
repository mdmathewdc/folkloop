-- Folkloop V1 Initial Database Schema
-- Temporal is authoritative for active workflow execution state.
-- PostgreSQL stores persistent business records, historical events, and read models.

CREATE TABLE IF NOT EXISTS villagers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  occupation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS villager_events (
  id TEXT PRIMARY KEY,
  villager_id TEXT NOT NULL REFERENCES villagers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  in_game_day INTEGER NOT NULL DEFAULT 1,
  in_game_hour INTEGER NOT NULL DEFAULT 0,
  in_game_minute INTEGER NOT NULL DEFAULT 0,
  workflow_id TEXT NOT NULL,
  run_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_villager_events_villager_occurred
  ON villager_events (villager_id, occurred_at DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS villager_state_snapshots (
  villager_id TEXT PRIMARY KEY REFERENCES villagers(id) ON DELETE CASCADE,
  hunger INTEGER NOT NULL CHECK (hunger >= 0 AND hunger <= 100),
  energy INTEGER NOT NULL CHECK (energy >= 0 AND energy <= 100),
  happiness INTEGER NOT NULL CHECK (happiness >= 0 AND happiness <= 100),
  current_activity TEXT NOT NULL,
  current_location TEXT NOT NULL,
  current_day INTEGER NOT NULL CHECK (current_day >= 1),
  current_hour INTEGER NOT NULL DEFAULT 0 CHECK (current_hour >= 0 AND current_hour <= 23),
  current_minute INTEGER NOT NULL DEFAULT 0 CHECK (current_minute >= 0 AND current_minute <= 59),
  last_event_seq INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS villager_notifications (
  id TEXT PRIMARY KEY,
  villager_id TEXT NOT NULL REFERENCES villagers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_villager_notifications_villager_created
  ON villager_notifications (villager_id, created_at DESC);

-- Seed Bob the Baker idempotently
INSERT INTO villagers (id, name, occupation)
VALUES ('bob', 'Bob', 'Baker')
ON CONFLICT (id) DO NOTHING;
