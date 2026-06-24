-- Generic key/value settings store for site-wide configuration.
-- Used (initially) to persist the homepage hero carousel: an ordered,
-- JSON-encoded list of deal (product) IDs the admin chooses to feature.
CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed an empty carousel selection (falls back to featured deals when empty).
INSERT OR IGNORE INTO site_settings (key, value) VALUES ('hero_carousel', '[]');
