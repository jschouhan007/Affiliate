-- Category hierarchy + reorder + remove Mobiles + Fashion subcategories
-- ---------------------------------------------------------------------------

-- 1. Add parent_id for nested categories (NULL = top-level).
ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id);

-- 2. Move any products/posts in "Mobiles" into "Tech & Gadgets" so nothing is
--    lost, then delete the Mobiles category entirely. (Both deals AND posts
--    have a FK to categories, so re-point both before deleting.)
UPDATE deals
   SET category_id = (SELECT id FROM categories WHERE slug = 'tech')
 WHERE category_id = (SELECT id FROM categories WHERE slug = 'mobiles');
UPDATE posts
   SET category_id = (SELECT id FROM categories WHERE slug = 'tech')
 WHERE category_id = (SELECT id FROM categories WHERE slug = 'mobiles');
DELETE FROM categories WHERE slug = 'mobiles';

-- 3. Re-order the remaining top-level categories:
--    Fashion > Home & Kitchen > Tech & Gadgets > Home Appliances > Outdoor & Sports
UPDATE categories SET sort_order = 1, parent_id = NULL WHERE slug = 'fashion';
UPDATE categories SET sort_order = 2, parent_id = NULL WHERE slug = 'home';
UPDATE categories SET sort_order = 3, parent_id = NULL WHERE slug = 'tech';
UPDATE categories SET sort_order = 4, parent_id = NULL WHERE slug = 'appliances';
UPDATE categories SET sort_order = 5, parent_id = NULL WHERE slug = 'outdoor';

-- 4. Fashion subcategories — two levels under Fashion:
--    Fashion > Men / Women > (T-Shirts, Shirts, Trousers, ...)

-- Level 1: Men & Women (parents = fashion)
INSERT OR IGNORE INTO categories (slug, name, icon, description, sort_order, parent_id) VALUES
  ('fashion-men',   "Men's Fashion",   'fas fa-person',       "Men's clothing, footwear & accessories.",   1, (SELECT id FROM categories WHERE slug='fashion')),
  ('fashion-women', "Women's Fashion", 'fas fa-person-dress', "Women's clothing, footwear & accessories.", 2, (SELECT id FROM categories WHERE slug='fashion'));

-- Level 2: Men's subcategories
INSERT OR IGNORE INTO categories (slug, name, icon, description, sort_order, parent_id) VALUES
  ('men-tshirts',     'T-Shirts',     'fas fa-shirt',       "Men's t-shirts & tees.",            1, (SELECT id FROM categories WHERE slug='fashion-men')),
  ('men-shirts',      'Shirts',       'fas fa-shirt',       "Men's casual & formal shirts.",     2, (SELECT id FROM categories WHERE slug='fashion-men')),
  ('men-trousers',    'Trousers',     'fas fa-user',        "Men's trousers & chinos.",          3, (SELECT id FROM categories WHERE slug='fashion-men')),
  ('men-jeans',       'Jeans',        'fas fa-user',        "Men's jeans & denim.",              4, (SELECT id FROM categories WHERE slug='fashion-men')),
  ('men-jackets',     'Jackets',      'fas fa-vest',        "Men's jackets & outerwear.",        5, (SELECT id FROM categories WHERE slug='fashion-men')),
  ('men-footwear',    'Footwear',     'fas fa-shoe-prints', "Men's shoes, sneakers & boots.",    6, (SELECT id FROM categories WHERE slug='fashion-men')),
  ('men-accessories', 'Accessories',  'fas fa-glasses',     "Men's watches, belts & accessories.", 7, (SELECT id FROM categories WHERE slug='fashion-men'));

-- Level 2: Women's subcategories
INSERT OR IGNORE INTO categories (slug, name, icon, description, sort_order, parent_id) VALUES
  ('women-tshirts',     'Tops & T-Shirts', 'fas fa-shirt',       "Women's tops & t-shirts.",            1, (SELECT id FROM categories WHERE slug='fashion-women')),
  ('women-dresses',     'Dresses',         'fas fa-person-dress',"Women's dresses & gowns.",            2, (SELECT id FROM categories WHERE slug='fashion-women')),
  ('women-trousers',    'Trousers',        'fas fa-user',        "Women's trousers & leggings.",        3, (SELECT id FROM categories WHERE slug='fashion-women')),
  ('women-jeans',       'Jeans',           'fas fa-user',        "Women's jeans & denim.",              4, (SELECT id FROM categories WHERE slug='fashion-women')),
  ('women-skirts',      'Skirts',          'fas fa-person-dress',"Women's skirts.",                     5, (SELECT id FROM categories WHERE slug='fashion-women')),
  ('women-footwear',    'Footwear',        'fas fa-shoe-prints', "Women's heels, flats & sneakers.",    6, (SELECT id FROM categories WHERE slug='fashion-women')),
  ('women-accessories', 'Accessories',     'fas fa-bag-shopping',"Women's bags, jewellery & accessories.", 7, (SELECT id FROM categories WHERE slug='fashion-women'));

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
