-- Editorial trust-signal fields

-- Deals: who tested it + a short verdict line for the byline area
ALTER TABLE deals ADD COLUMN tested_by TEXT;
ALTER TABLE deals ADD COLUMN verdict TEXT;       -- one-line editorial verdict
ALTER TABLE deals ADD COLUMN award TEXT;         -- e.g. "Editor's Choice", "Best Value"

-- Posts: author role + read time for editorial byline
ALTER TABLE posts ADD COLUMN author_role TEXT;
ALTER TABLE posts ADD COLUMN read_minutes INTEGER DEFAULT 5;
ALTER TABLE posts ADD COLUMN dek TEXT;           -- editorial standfirst / subtitle
