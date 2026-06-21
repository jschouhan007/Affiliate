-- ============================================================
-- DealSpot — Affiliate + Blog site schema
-- Cloudflare D1 (SQLite)
-- ============================================================

-- Top-level categories (Mobiles, Tech, Appliances, Outdoor, etc.)
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  icon        TEXT,                 -- font-awesome icon class
  description TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Affiliate links: the single source of truth for outbound URLs.
-- Content references a link by slug via /go/:slug; destination can be swapped sitewide.
CREATE TABLE IF NOT EXISTS affiliate_links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT UNIQUE NOT NULL,     -- e.g. "boat-airdopes-141-amazon"
  retailer    TEXT NOT NULL,            -- amazon | flipkart | other
  dest_url    TEXT NOT NULL,            -- the real (tagged) affiliate URL
  label       TEXT,                     -- human label e.g. "Buy on Amazon"
  active      INTEGER DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Deals (the "money" items). Each deal can belong to a category and have
-- one or more retailer offers (prices) linked through affiliate_links.
CREATE TABLE IF NOT EXISTS deals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  category_id   INTEGER,
  brand         TEXT,
  image_url     TEXT,
  short_desc    TEXT,
  description   TEXT,                   -- markdown
  rating        REAL,                   -- our honest 0-5 rating (nullable)
  rating_count  INTEGER DEFAULT 0,
  pros          TEXT,                   -- newline-separated
  cons          TEXT,                   -- newline-separated
  featured      INTEGER DEFAULT 0,
  published     INTEGER DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Offers: a deal's price at a specific retailer, tied to an affiliate link.
CREATE TABLE IF NOT EXISTS offers (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id           INTEGER NOT NULL,
  retailer          TEXT NOT NULL,        -- amazon | flipkart | other
  affiliate_link_id INTEGER,
  price             REAL,
  original_price    REAL,
  currency          TEXT DEFAULT 'INR',
  in_stock          INTEGER DEFAULT 1,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deal_id) REFERENCES deals(id),
  FOREIGN KEY (affiliate_link_id) REFERENCES affiliate_links(id)
);

-- Blog posts (authority/content engine). Body stored as markdown.
CREATE TABLE IF NOT EXISTS posts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  excerpt       TEXT,
  body          TEXT NOT NULL,          -- markdown
  cover_image   TEXT,
  category_id   INTEGER,
  author        TEXT DEFAULT 'DealSpot Editorial',
  post_type     TEXT DEFAULT 'blog',    -- blog | guide | comparison (pillar)
  pillar        INTEGER DEFAULT 0,      -- 1 = pillar/"best of" page
  published     INTEGER DEFAULT 1,
  published_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Many-to-many: posts <-> deals (a "best of" pillar lists multiple deals).
CREATE TABLE IF NOT EXISTS post_deals (
  post_id     INTEGER NOT NULL,
  deal_id     INTEGER NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  PRIMARY KEY (post_id, deal_id),
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (deal_id) REFERENCES deals(id)
);

-- FAQ entries attached to posts or deals (powers FAQPage JSON-LD).
CREATE TABLE IF NOT EXISTS faqs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_type TEXT NOT NULL,            -- post | deal
  parent_id   INTEGER NOT NULL,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0
);

-- First-party click analytics from /go/:slug
CREATE TABLE IF NOT EXISTS clicks (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_link_id INTEGER,
  link_slug         TEXT,
  source_path       TEXT,               -- referring page on our site
  retailer          TEXT,
  user_agent        TEXT,
  country           TEXT,
  clicked_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS subscribers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT UNIQUE NOT NULL,
  source_path TEXT,
  confirmed   INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deals_category ON deals(category_id);
CREATE INDEX IF NOT EXISTS idx_deals_featured ON deals(featured);
CREATE INDEX IF NOT EXISTS idx_offers_deal ON offers(deal_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_pillar ON posts(pillar);
CREATE INDEX IF NOT EXISTS idx_clicks_link ON clicks(affiliate_link_id);
CREATE INDEX IF NOT EXISTS idx_clicks_date ON clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_faqs_parent ON faqs(parent_type, parent_id);
