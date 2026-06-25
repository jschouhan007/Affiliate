-- Assign the demo fashion products to appropriate Men's/Women's subcategories
-- so the new category hierarchy + filters are demonstrably functional.

UPDATE deals SET category_id = (SELECT id FROM categories WHERE slug='men-shirts')      WHERE id IN (1001, 1012);            -- Oxford Shirt, Ribbed Polo
UPDATE deals SET category_id = (SELECT id FROM categories WHERE slug='men-trousers')    WHERE id IN (1002, 1018);            -- Chinos, Wide-Leg Trousers
UPDATE deals SET category_id = (SELECT id FROM categories WHERE slug='men-tshirts')     WHERE id IN (1003, 1015, 1017);      -- Sweater, Tee 3-Pack, Cardigan
UPDATE deals SET category_id = (SELECT id FROM categories WHERE slug='men-footwear')    WHERE id IN (1004, 1010, 1020);      -- Chelsea Boots, Loafers, Sneakers
UPDATE deals SET category_id = (SELECT id FROM categories WHERE slug='men-jackets')     WHERE id IN (1005, 1006, 1011, 1014, 1016, 1021, 1023); -- Bomber, Blazer, Trench, Trucker, Overcoat, Puffer Vest, Shirt Jacket
UPDATE deals SET category_id = (SELECT id FROM categories WHERE slug='men-accessories') WHERE id IN (1007, 1019, 1022);      -- Scarf, Crossbody Bag, Houndstooth Scarf
UPDATE deals SET category_id = (SELECT id FROM categories WHERE slug='men-jeans')       WHERE id IN (1008);                  -- Tapered Jeans

UPDATE deals SET category_id = (SELECT id FROM categories WHERE slug='women-dresses')   WHERE id IN (1009);                  -- Silk Wrap Midi Dress
UPDATE deals SET category_id = (SELECT id FROM categories WHERE slug='women-skirts')    WHERE id IN (1013, 1024);            -- Maxi Skirt, Tennis Skirt
