-- Hub-and-spoke architecture + filterable product features

-- Deal "features" used for faceted filtering (comma-separated tags + key specs).
ALTER TABLE deals ADD COLUMN features TEXT;     -- e.g. "Wireless,Waterproof,Fast Charging"
ALTER TABLE deals ADD COLUMN spec_summary TEXT; -- short spec line for matrix rows

-- Hub pages: curated, programmatic collections (e.g. "Best Tech for Students")
CREATE TABLE IF NOT EXISTS hubs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  dek          TEXT,
  intro        TEXT,                  -- markdown intro
  cover_image  TEXT,
  rule_type    TEXT DEFAULT 'manual', -- manual | category | feature | price
  rule_value   TEXT,                  -- e.g. category slug, feature tag, or max price
  published    INTEGER DEFAULT 1,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Manual spoke links for hubs with rule_type='manual'
CREATE TABLE IF NOT EXISTS hub_deals (
  hub_id      INTEGER NOT NULL,
  deal_id     INTEGER NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  note        TEXT,                  -- why this pick belongs in the hub
  PRIMARY KEY (hub_id, deal_id),
  FOREIGN KEY (hub_id) REFERENCES hubs(id),
  FOREIGN KEY (deal_id) REFERENCES deals(id)
);

CREATE INDEX IF NOT EXISTS idx_hub_deals_hub ON hub_deals(hub_id);
