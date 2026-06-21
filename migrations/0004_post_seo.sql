-- Phase 6: dedicated SEO fields for blog posts.
-- These let the admin editor control exactly how each post appears in
-- search results and social shares, independent of the body content.

ALTER TABLE posts ADD COLUMN meta_title TEXT;
ALTER TABLE posts ADD COLUMN meta_description TEXT;
ALTER TABLE posts ADD COLUMN meta_keywords TEXT;
ALTER TABLE posts ADD COLUMN og_image TEXT;
ALTER TABLE posts ADD COLUMN canonical_url TEXT;
ALTER TABLE posts ADD COLUMN noindex INTEGER NOT NULL DEFAULT 0;
