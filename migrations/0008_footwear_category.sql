-- 0008: Add a dedicated top-level "Footwear" category.
-- Footwear was previously buried as a leaf under Men's / Women's Fashion. This
-- promotes it to a first-class top-level category (between Fashion and Home &
-- Kitchen) with Men's / Women's / Sports sub-categories, so shoes are easy to
-- browse on their own. The existing per-gender footwear leaves are kept (they
-- still live under Fashion → Men's/Women's) and we ALSO add new ones here.

-- Bump the existing top-level categories' sort_order to make room at slot 2.
UPDATE categories SET sort_order = sort_order + 1 WHERE parent_id IS NULL AND sort_order >= 2;

-- New top-level Footwear category.
INSERT INTO categories (slug, name, icon, description, parent_id, sort_order)
VALUES ('footwear', 'Footwear', 'fas fa-shoe-prints', 'Shoes, sneakers, sandals & more for everyone.', NULL, 2);

-- Footwear sub-categories.
INSERT INTO categories (slug, name, icon, parent_id, sort_order)
SELECT 'footwear-men', 'Men''s Footwear', 'fas fa-person', id, 1 FROM categories WHERE slug = 'footwear';
INSERT INTO categories (slug, name, icon, parent_id, sort_order)
SELECT 'footwear-women', 'Women''s Footwear', 'fas fa-person-dress', id, 2 FROM categories WHERE slug = 'footwear';
INSERT INTO categories (slug, name, icon, parent_id, sort_order)
SELECT 'footwear-sports', 'Sports & Sneakers', 'fas fa-shoe-prints', id, 3 FROM categories WHERE slug = 'footwear';

-- Leaf types under Men's Footwear.
INSERT INTO categories (slug, name, parent_id, sort_order)
SELECT 'footwear-men-sneakers', 'Sneakers', id, 1 FROM categories WHERE slug = 'footwear-men';
INSERT INTO categories (slug, name, parent_id, sort_order)
SELECT 'footwear-men-formal', 'Formal Shoes', id, 2 FROM categories WHERE slug = 'footwear-men';
INSERT INTO categories (slug, name, parent_id, sort_order)
SELECT 'footwear-men-sandals', 'Sandals & Slides', id, 3 FROM categories WHERE slug = 'footwear-men';

-- Leaf types under Women's Footwear.
INSERT INTO categories (slug, name, parent_id, sort_order)
SELECT 'footwear-women-heels', 'Heels', id, 1 FROM categories WHERE slug = 'footwear-women';
INSERT INTO categories (slug, name, parent_id, sort_order)
SELECT 'footwear-women-flats', 'Flats & Ballerinas', id, 2 FROM categories WHERE slug = 'footwear-women';
INSERT INTO categories (slug, name, parent_id, sort_order)
SELECT 'footwear-women-sneakers', 'Sneakers', id, 3 FROM categories WHERE slug = 'footwear-women';
