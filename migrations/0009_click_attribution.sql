-- 0009: First-party attribution on outbound clicks.
-- Records the UTM campaign + landing page that originally brought the visitor
-- in, plus the device & whether we attempted a native-app deep link. This lets
-- you answer "which article/campaign drove this affiliate click?" using only
-- first-party data (no third-party cookies).
ALTER TABLE clicks ADD COLUMN utm_source TEXT;
ALTER TABLE clicks ADD COLUMN utm_medium TEXT;
ALTER TABLE clicks ADD COLUMN utm_campaign TEXT;
ALTER TABLE clicks ADD COLUMN utm_content TEXT;
ALTER TABLE clicks ADD COLUMN utm_term TEXT;
ALTER TABLE clicks ADD COLUMN landing_path TEXT;
ALTER TABLE clicks ADD COLUMN device TEXT;
ALTER TABLE clicks ADD COLUMN deep_link INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_clicks_campaign ON clicks(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_clicks_source ON clicks(utm_source);
