-- ============================================================
-- DealSpot seed data (sample, multi-category)
-- Note: dest_url values are placeholder affiliate links.
-- Replace with your real tagged Amazon/Flipkart URLs.
-- ============================================================

DELETE FROM post_deals;
DELETE FROM offers;
DELETE FROM faqs;
DELETE FROM clicks;
DELETE FROM deals;
DELETE FROM posts;
DELETE FROM affiliate_links;
DELETE FROM categories;
DELETE FROM sqlite_sequence WHERE name IN ('deals','posts','affiliate_links','categories','offers','faqs');

-- Categories
INSERT INTO categories (slug, name, icon, description, sort_order) VALUES
  ('mobiles', 'Mobiles', 'fas fa-mobile-screen', 'Best deals on smartphones from budget to flagship.', 1),
  ('tech', 'Tech & Gadgets', 'fas fa-headphones', 'Earbuds, smartwatches, laptops and gadget deals.', 2),
  ('appliances', 'Home Appliances', 'fas fa-blender', 'Discounts on kitchen and home appliances.', 3),
  ('home', 'Home & Kitchen', 'fas fa-couch', 'Furniture, decor and everyday home essentials.', 4),
  ('outdoor', 'Outdoor & Sports', 'fas fa-person-hiking', 'Gear for fitness, travel and the outdoors.', 5),
  ('fashion', 'Fashion', 'fas fa-shirt', 'Clothing, footwear and accessory deals.', 6);

-- Affiliate links (single source of truth)
INSERT INTO affiliate_links (slug, retailer, dest_url, label) VALUES
  ('redmi-13c-amazon', 'amazon', 'https://www.amazon.in/dp/B0CGXXXXXX?tag=dealspot-21', 'Buy on Amazon'),
  ('redmi-13c-flipkart', 'flipkart', 'https://www.flipkart.com/redmi-13c?affid=dealspot', 'Buy on Flipkart'),
  ('boat-airdopes-amazon', 'amazon', 'https://www.amazon.in/dp/B09XXXXXX?tag=dealspot-21', 'Buy on Amazon'),
  ('boat-airdopes-flipkart', 'flipkart', 'https://www.flipkart.com/boat-airdopes-141?affid=dealspot', 'Buy on Flipkart'),
  ('noise-watch-amazon', 'amazon', 'https://www.amazon.in/dp/B0BXXXXXX?tag=dealspot-21', 'Buy on Amazon'),
  ('prestige-mixer-amazon', 'amazon', 'https://www.amazon.in/dp/B07XXXXXX?tag=dealspot-21', 'Buy on Amazon'),
  ('prestige-mixer-flipkart', 'flipkart', 'https://www.flipkart.com/prestige-mixer?affid=dealspot', 'Buy on Flipkart'),
  ('decathlon-backpack-amazon', 'amazon', 'https://www.amazon.in/dp/B08XXXXXX?tag=dealspot-21', 'Buy on Amazon'),
  ('realme-buds-amazon', 'amazon', 'https://www.amazon.in/dp/B0CXXXXXX?tag=dealspot-21', 'Buy on Amazon'),
  ('oneplus-nord-amazon', 'amazon', 'https://www.amazon.in/dp/B0DXXXXXX?tag=dealspot-21', 'Buy on Amazon'),
  ('oneplus-nord-flipkart', 'flipkart', 'https://www.flipkart.com/oneplus-nord-ce4?affid=dealspot', 'Buy on Flipkart'),
  ('instant-pot-amazon', 'amazon', 'https://www.amazon.in/dp/B0EXXXXXX?tag=dealspot-21', 'Buy on Amazon'),
  ('yoga-mat-flipkart', 'flipkart', 'https://www.flipkart.com/yoga-mat?affid=dealspot', 'Buy on Flipkart'),
  ('fire-tv-amazon', 'amazon', 'https://www.amazon.in/dp/B0FXXXXXX?tag=dealspot-21', 'Buy on Amazon');

-- Deals
INSERT INTO deals (slug, title, category_id, brand, image_url, short_desc, description, rating, rating_count, pros, cons, featured) VALUES
  ('redmi-13c-5g', 'Redmi 13C 5G (4GB/128GB)', 1, 'Redmi',
   'https://m.media-amazon.com/images/I/81X5cKQ8mGL._SL1500_.jpg',
   'A genuinely capable 5G phone under ₹11,000 with a 90Hz display and 50MP camera.',
   '## Verdict\nThe Redmi 13C 5G punches above its price. The **90Hz display** is smooth, 5G works on all major Indian bands, and battery life comfortably lasts a full day.\n\n### Who it''s for\nFirst-time 5G buyers and anyone needing a reliable backup phone on a tight budget.\n\n### Performance\nThe Dimensity 6100+ handles everyday apps and light gaming well. Heavy multitaskers should pick the 6GB variant.',
   4.1, 184,
   'Affordable 5G\n90Hz display\nDecent battery life\nClean software', 'Average low-light camera\nMicro-USB on base variant', 1),

  ('boat-airdopes-141', 'boAt Airdopes 141 TWS Earbuds', 2, 'boAt',
   'https://m.media-amazon.com/images/I/61u1VALn6JL._SL1500_.jpg',
   'India''s best-selling budget earbuds with 42-hour playback and low-latency gaming mode.',
   '## Verdict\nAt this price the Airdopes 141 are unbeatable for casual listening. **42 hours total playback**, ENx noise reduction for calls, and BEAST mode for gaming.\n\n### Sound\nBass-forward signature that suits Bollywood and pop. Audiophiles will want more, but for the money it''s excellent.',
   4.0, 1203,
   'Huge battery life\nLow-latency gaming mode\nIPX4 sweat resistance\nVery affordable', 'Bass-heavy tuning\nPlastic build', 1),

  ('noise-colorfit-pro-5', 'Noise ColorFit Pro 5 Smartwatch', 2, 'Noise',
   'https://m.media-amazon.com/images/I/618I0bWcq5L._SL1500_.jpg',
   'A 1.85" AMOLED smartwatch with Bluetooth calling and 7-day battery.',
   '## Verdict\nThe ColorFit Pro 5 nails the basics: a bright **AMOLED display**, reliable Bluetooth calling, and SpO2/heart-rate tracking. Fitness accuracy is good enough for casual users.',
   3.9, 642,
   'Bright AMOLED screen\nBluetooth calling\n7-day battery\n100+ sport modes', 'GPS is phone-dependent\nApp could be smoother', 0),

  ('prestige-iris-mixer', 'Prestige IRIS 750W Mixer Grinder', 3, 'Prestige',
   'https://m.media-amazon.com/images/I/61qN5b6mYVL._SL1500_.jpg',
   'A reliable 750W mixer with 3 stainless steel jars — a kitchen workhorse.',
   '## Verdict\nThe Prestige IRIS is the default recommendation for most Indian kitchens. **750W** handles tough spices and wet grinding, and the jars are genuinely durable.',
   4.2, 8900,
   'Powerful 750W motor\n3 durable jars\n2-year warranty\nGreat value', 'A little loud\nBasic design', 1),

  ('decathlon-quechua-backpack', 'Quechua NH100 20L Hiking Backpack', 5, 'Quechua',
   'https://m.media-amazon.com/images/I/71xYQ8u8wQL._SL1500_.jpg',
   'A lightweight, comfortable 20L daypack perfect for day hikes and commutes.',
   '## Verdict\nDecathlon''s NH100 is the best value daypack you can buy. **20L** is ideal for day trips, the back padding is comfortable, and it survives daily abuse.',
   4.3, 2100,
   'Excellent value\nComfortable padding\nLightweight\nDurable fabric', 'No rain cover included\nLimited organisation', 0),

  ('realme-buds-air-6', 'realme Buds Air 6 ANC Earbuds', 2, 'realme',
   'https://m.media-amazon.com/images/I/61cwXdjmHdL._SL1500_.jpg',
   'Active noise cancellation up to 50dB and LDAC support under ₹4,000.',
   '## Verdict\nThe Buds Air 6 bring **real ANC** and Hi-Res LDAC audio to the sub-₹4k segment. A clear step up from basic budget buds.',
   4.1, 530,
   'Effective 50dB ANC\nLDAC Hi-Res audio\nFast charging\nComfortable fit', 'Mic average in wind\nNo wireless charging', 0),

  ('oneplus-nord-ce4', 'OnePlus Nord CE4 (8GB/128GB)', 1, 'OnePlus',
   'https://m.media-amazon.com/images/I/61iFi0kxQyL._SL1500_.jpg',
   'A mid-range all-rounder with 100W fast charging and a smooth 120Hz AMOLED.',
   '## Verdict\nThe Nord CE4 is the mid-range value pick: **100W charging** (0-100 in ~30 min), a gorgeous 120Hz AMOLED, and the Snapdragon 7 Gen 3 keeps everything fast.',
   4.3, 970,
   '100W fast charging\n120Hz AMOLED\nStrong performance\nClean OxygenOS', 'No wireless charging\nSingle useful rear camera', 1),

  ('instant-pot-duo', 'Instant Pot Duo 6L Electric Pressure Cooker', 3, 'Instant Pot',
   'https://m.media-amazon.com/images/I/71V1LrY1MSL._SL1500_.jpg',
   '7-in-1 multicooker that replaces a pressure cooker, rice cooker, steamer and more.',
   '## Verdict\nThe Instant Pot Duo is a genuine kitchen upgrade. **7 appliances in one**, consistent results, and it frees up your stovetop.',
   4.4, 15600,
   'Replaces multiple appliances\nConsistent results\nEasy cleanup\nSafe & reliable', 'Learning curve\nTakes counter space', 0),

  ('boldfit-yoga-mat', 'Boldfit Yoga Mat 6mm (Anti-Slip)', 5, 'Boldfit',
   'https://m.media-amazon.com/images/I/71xY0sP0t2L._SL1500_.jpg',
   'A cushioned 6mm anti-slip mat for yoga, pilates and home workouts.',
   '## Verdict\nGood cushioning and grip at a fair price. The **6mm thickness** protects your joints during floor work.',
   4.0, 3400,
   'Good cushioning\nAnti-slip surface\nCarry strap included\nEasy to clean', 'Slight initial odour\nThinner than premium mats', 0),

  ('fire-tv-stick-4k', 'Amazon Fire TV Stick 4K (2024)', 4, 'Amazon',
   'https://m.media-amazon.com/images/I/51TjJOTfslL._SL1000_.jpg',
   'Turn any TV into a smart 4K streaming machine with Alexa voice remote.',
   '## Verdict\nThe Fire TV Stick 4K is the easiest way to make a TV smart. **4K HDR, Dolby Vision**, and snappy navigation with the Alexa remote.',
   4.4, 22000,
   '4K HDR & Dolby Vision\nFast navigation\nAlexa voice remote\nGreat value', 'Ad-heavy home screen\nAmazon-centric UI', 1);

-- Offers (link deals to retailers via affiliate_links)
INSERT INTO offers (deal_id, retailer, affiliate_link_id, price, original_price) VALUES
  (1, 'amazon',   (SELECT id FROM affiliate_links WHERE slug='redmi-13c-amazon'),   10499, 14999),
  (1, 'flipkart', (SELECT id FROM affiliate_links WHERE slug='redmi-13c-flipkart'), 10999, 14999),
  (2, 'amazon',   (SELECT id FROM affiliate_links WHERE slug='boat-airdopes-amazon'),   1099, 4490),
  (2, 'flipkart', (SELECT id FROM affiliate_links WHERE slug='boat-airdopes-flipkart'), 1199, 4490),
  (3, 'amazon',   (SELECT id FROM affiliate_links WHERE slug='noise-watch-amazon'), 2999, 6999),
  (4, 'amazon',   (SELECT id FROM affiliate_links WHERE slug='prestige-mixer-amazon'),   3199, 5295),
  (4, 'flipkart', (SELECT id FROM affiliate_links WHERE slug='prestige-mixer-flipkart'), 3299, 5295),
  (5, 'amazon',   (SELECT id FROM affiliate_links WHERE slug='decathlon-backpack-amazon'), 599, 799),
  (6, 'amazon',   (SELECT id FROM affiliate_links WHERE slug='realme-buds-amazon'), 3499, 5999),
  (7, 'amazon',   (SELECT id FROM affiliate_links WHERE slug='oneplus-nord-amazon'),   24999, 28999),
  (7, 'flipkart', (SELECT id FROM affiliate_links WHERE slug='oneplus-nord-flipkart'), 24499, 28999),
  (8, 'amazon',   (SELECT id FROM affiliate_links WHERE slug='instant-pot-amazon'), 7999, 11995),
  (9, 'flipkart', (SELECT id FROM affiliate_links WHERE slug='yoga-mat-flipkart'), 699, 1499),
  (10, 'amazon',  (SELECT id FROM affiliate_links WHERE slug='fire-tv-amazon'), 4499, 6999);

-- Posts (blog + pillar guides)
INSERT INTO posts (slug, title, excerpt, body, cover_image, category_id, post_type, pillar, published_at, updated_at) VALUES
  ('best-budget-earbuds-under-2000',
   'Best Budget Wireless Earbuds Under ₹2,000 (2026)',
   'We tested the most popular budget TWS earbuds to find which ones actually sound good and last. Here are our top picks under ₹2,000.',
   '## The short answer\nIf you want the best budget earbuds under ₹2,000 right now, the **boAt Airdopes 141** are our top pick for battery life and value, while the **realme Buds Air 6** are worth stretching for if you want real noise cancellation.\n\nBudget earbuds have improved dramatically. You no longer need to spend ₹5,000+ for all-day battery, water resistance, and a low-latency gaming mode. Below are the models we actually recommend after testing.\n\n## How we tested\nWe used each pair for at least a week of mixed listening — music, calls, and gaming — and measured real battery life rather than trusting the box.\n\n## What to look for\n- **Battery life**: 30+ hours total (buds + case) is now standard.\n- **Latency**: Look for a dedicated low-latency/gaming mode if you play mobile games.\n- **Water resistance**: IPX4 or higher if you work out.\n- **Call quality**: Often the weakest point on budget buds — check reviews.\n\n## The verdict\nFor most people the boAt Airdopes 141 deliver the best balance of price and battery. Step up to the realme Buds Air 6 if active noise cancellation matters to you.',
   'https://m.media-amazon.com/images/I/61u1VALn6JL._SL1500_.jpg',
   2, 'comparison', 1, '2026-05-20 10:00:00', '2026-06-10 10:00:00'),

  ('best-5g-phones-under-15000',
   'Best 5G Phones Under ₹15,000 in India (2026)',
   'The sub-₹15,000 segment is where 5G value lives. We compare the best 5G smartphones you can buy on a budget right now.',
   '## The short answer\nThe **Redmi 13C 5G** is the best value 5G phone under ₹15,000 for most buyers, thanks to its 90Hz display and dependable battery. If your budget can stretch, the **OnePlus Nord CE4** is a major step up in performance and charging speed.\n\n## Why buy a budget 5G phone now\n5G coverage across India is now broad enough that future-proofing makes sense even on a budget. The good news: capable 5G phones now start near ₹10,000.\n\n## What matters most\n- **Display**: A 90Hz or 120Hz panel makes the whole phone feel faster.\n- **Battery & charging**: Look for 5000mAh and at least 18W charging.\n- **Software updates**: Check the promised Android version updates.\n\n## Our picks\nStart with the Redmi 13C 5G if you''re on a tight budget. The OnePlus Nord CE4 is the pick if performance and 100W charging matter to you.',
   'https://m.media-amazon.com/images/I/81X5cKQ8mGL._SL1500_.jpg',
   1, 'comparison', 1, '2026-05-28 09:00:00', '2026-06-12 09:00:00'),

  ('how-to-spot-a-fake-discount',
   'How to Spot a Fake Discount (Before You Get Tricked)',
   'That "60% off" tag might be hiding an inflated original price. Here''s how to tell a real deal from a fake one.',
   '## The short answer\nA discount is only real if the "original price" was genuinely charged recently. The fastest way to verify is to **check the price history** with a tracker before you buy.\n\n## The inflated-MRP trick\nMany listings show a struck-through "original price" that the product never actually sold at. The displayed discount percentage is meaningless if the base price is fake.\n\n## How to verify a deal in 60 seconds\n1. **Check price history** using a free browser extension or price-tracking site.\n2. **Compare across retailers** — if Amazon and Flipkart both sit near the "discounted" price, that''s the real price.\n3. **Ignore the percentage, look at the absolute price** — is this genuinely cheaper than usual?\n4. **Watch for sale-event inflation** — some prices quietly rise just before big sale events.\n\n## How we help\nEvery deal on DealSpot is price-checked before we publish it, and we link to multiple retailers so you can compare instantly.',
   'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80',
   NULL, 'blog', 0, '2026-06-01 11:00:00', '2026-06-01 11:00:00'),

  ('best-mixer-grinder-india',
   'Best Mixer Grinder in India for Every Budget (2026)',
   'From everyday dal-grinding to heavy masala prep, here are the mixer grinders that are actually worth buying.',
   '## The short answer\nThe **Prestige IRIS 750W** is the best all-round mixer grinder for most Indian kitchens — powerful, durable, and well-priced.\n\n## What wattage do you need?\n- **500W**: Light daily use, small families.\n- **750W**: The sweet spot — handles tough spices and wet grinding.\n- **1000W+**: Heavy daily use or large families.\n\n## What to check\n- **Jar quality**: Stainless steel lasts far longer than plastic.\n- **Warranty**: 2 years on the motor is ideal.\n- **Noise**: All mixers are loud; read reviews for the worst offenders.\n\n## Our pick\nThe Prestige IRIS 750W hits the best balance of power, durability and price.',
   'https://m.media-amazon.com/images/I/61qN5b6mYVL._SL1500_.jpg',
   3, 'comparison', 1, '2026-06-05 08:00:00', '2026-06-05 08:00:00');

-- Link pillar posts to their deals
INSERT INTO post_deals (post_id, deal_id, sort_order) VALUES
  ((SELECT id FROM posts WHERE slug='best-budget-earbuds-under-2000'), (SELECT id FROM deals WHERE slug='boat-airdopes-141'), 1),
  ((SELECT id FROM posts WHERE slug='best-budget-earbuds-under-2000'), (SELECT id FROM deals WHERE slug='realme-buds-air-6'), 2),
  ((SELECT id FROM posts WHERE slug='best-5g-phones-under-15000'), (SELECT id FROM deals WHERE slug='redmi-13c-5g'), 1),
  ((SELECT id FROM posts WHERE slug='best-5g-phones-under-15000'), (SELECT id FROM deals WHERE slug='oneplus-nord-ce4'), 2),
  ((SELECT id FROM posts WHERE slug='best-mixer-grinder-india'), (SELECT id FROM deals WHERE slug='prestige-iris-mixer'), 1);

-- FAQs
INSERT INTO faqs (parent_type, parent_id, question, answer, sort_order) VALUES
  ('post', (SELECT id FROM posts WHERE slug='best-budget-earbuds-under-2000'), 'Are budget earbuds good for calls?', 'Call quality is usually the weakest point on budget earbuds. Models with ENx or similar noise reduction (like the boAt Airdopes 141) perform noticeably better in quiet environments, but struggle in heavy wind.', 1),
  ('post', (SELECT id FROM posts WHERE slug='best-budget-earbuds-under-2000'), 'Do cheap earbuds support gaming?', 'Yes — most now include a low-latency or "gaming" mode that reduces audio delay so sound stays in sync with the video. Look for this feature explicitly.', 2),
  ('post', (SELECT id FROM posts WHERE slug='best-5g-phones-under-15000'), 'Is 5G worth it under ₹15,000?', 'Yes, if you plan to keep the phone 2-3 years. 5G coverage in India is now widespread, and the price premium for 5G at this budget is small.', 1),
  ('deal', (SELECT id FROM deals WHERE slug='redmi-13c-5g'), 'Does the Redmi 13C 5G support all Indian 5G bands?', 'Yes, it supports the major 5G bands used by Jio and Airtel in India.', 1),
  ('deal', (SELECT id FROM deals WHERE slug='boat-airdopes-141'), 'What is the real battery life of the Airdopes 141?', 'You get roughly 5-6 hours per charge from the buds and around 42 hours total including the case, depending on volume.', 1);

-- ============================================================
-- Editorial trust data (verdicts, tested_by, awards)
-- ============================================================
UPDATE deals SET tested_by='Aarav Mehta', award='Editor''s Choice',
  verdict='The most phone you can buy under ₹11,000 — and it doesn''t feel like a compromise.'
  WHERE slug='redmi-13c-5g';
UPDATE deals SET tested_by='Priya Nair', award='Best Value',
  verdict='Unbeatable battery life for the price. The default pick for casual listeners.'
  WHERE slug='boat-airdopes-141';
UPDATE deals SET tested_by='Priya Nair',
  verdict='A genuinely bright AMOLED and reliable calling, let down only by a fiddly app.'
  WHERE slug='noise-colorfit-pro-5';
UPDATE deals SET tested_by='Sunita Rao', award='Editor''s Choice',
  verdict='The kitchen workhorse we keep recommending. Powerful, durable, and fairly priced.'
  WHERE slug='prestige-iris-mixer';
UPDATE deals SET tested_by='Vikram Singh',
  verdict='The best value daypack in India. It simply outlasts bags twice the price.'
  WHERE slug='decathlon-quechua-backpack';
UPDATE deals SET tested_by='Priya Nair', award='Best ANC under ₹4k',
  verdict='Real noise cancellation and Hi-Res audio at a price that used to buy neither.'
  WHERE slug='realme-buds-air-6';
UPDATE deals SET tested_by='Aarav Mehta', award='Best Mid-Range',
  verdict='100W charging and a gorgeous screen make this the value champion of the segment.'
  WHERE slug='oneplus-nord-ce4';
UPDATE deals SET tested_by='Sunita Rao',
  verdict='Replaces a drawer full of appliances and frees up your stovetop. Worth the learning curve.'
  WHERE slug='instant-pot-duo';
UPDATE deals SET tested_by='Vikram Singh',
  verdict='Good cushioning and grip at a fair price — a sensible first mat.'
  WHERE slug='boldfit-yoga-mat';
UPDATE deals SET tested_by='Aarav Mehta', award='Best Streaming Stick',
  verdict='The easiest, cheapest way to make any TV genuinely smart.'
  WHERE slug='fire-tv-stick-4k';

UPDATE posts SET author='Priya Nair', author_role='Senior Audio Editor', read_minutes=8,
  dek='We lived with the most popular budget earbuds for weeks. These are the only two worth your money.'
  WHERE slug='best-budget-earbuds-under-2000';
UPDATE posts SET author='Aarav Mehta', author_role='Mobile Editor', read_minutes=9,
  dek='Sub-₹15,000 is where 5G value lives in 2026. Here is exactly what to buy, and why.'
  WHERE slug='best-5g-phones-under-15000';
UPDATE posts SET author='Rohan Desai', author_role='Consumer Editor', read_minutes=6,
  dek='That "60% off" tag is often hiding an inflated original price. Here is how to never get fooled again.'
  WHERE slug='how-to-spot-a-fake-discount';
UPDATE posts SET author='Sunita Rao', author_role='Home & Kitchen Editor', read_minutes=7,
  dek='From everyday dal to heavy masala prep, the mixer grinders that actually earn their place on your counter.'
  WHERE slug='best-mixer-grinder-india';
