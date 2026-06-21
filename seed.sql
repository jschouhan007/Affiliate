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

-- ============================================================
-- Filterable features + spec summaries (for faceted search & matrix)
-- ============================================================
UPDATE deals SET features='5G,Fast Charging,Big Battery,90Hz Display', spec_summary='6.74" 90Hz · Dimensity 6100+ · 5000mAh' WHERE slug='redmi-13c-5g';
UPDATE deals SET features='Wireless,Sweat Resistant,Gaming Mode,Long Battery', spec_summary='42h battery · IPX4 · BEAST low-latency mode' WHERE slug='boat-airdopes-141';
UPDATE deals SET features='Bluetooth Calling,AMOLED,Long Battery,Fitness', spec_summary='1.85" AMOLED · BT calling · 7-day battery' WHERE slug='noise-colorfit-pro-5';
UPDATE deals SET features='High Power,Warranty,Durable', spec_summary='750W · 3 SS jars · 2-yr warranty' WHERE slug='prestige-iris-mixer';
UPDATE deals SET features='Lightweight,Durable,Water Resistant', spec_summary='20L · padded back · daily-use fabric' WHERE slug='decathlon-quechua-backpack';
UPDATE deals SET features='Wireless,Noise Cancelling,Hi-Res,Fast Charging', spec_summary='50dB ANC · LDAC Hi-Res · fast charge' WHERE slug='realme-buds-air-6';
UPDATE deals SET features='5G,Fast Charging,AMOLED,120Hz Display', spec_summary='120Hz AMOLED · SD 7 Gen 3 · 100W charging' WHERE slug='oneplus-nord-ce4';
UPDATE deals SET features='Multi-Cooker,Programmable,Durable', spec_summary='6L · 7-in-1 · stainless inner pot' WHERE slug='instant-pot-duo';
UPDATE deals SET features='Anti-Slip,Lightweight,Easy Clean', spec_summary='6mm · anti-slip · carry strap' WHERE slug='boldfit-yoga-mat';
UPDATE deals SET features='4K,HDR,Voice Remote,Streaming', spec_summary='4K HDR · Dolby Vision · Alexa remote' WHERE slug='fire-tv-stick-4k';

-- ============================================================
-- Hub-and-spoke pages
-- ============================================================
INSERT INTO hubs (slug, title, dek, intro, rule_type, rule_value) VALUES
  ('best-tech-for-students',
   'Best Tech & Gadgets for Students',
   'A complete, tested kit for studying smarter — without blowing the semester budget.',
   'We assembled a student starter kit from products we''ve actually tested. Each pick balances **price, durability and genuine usefulness** for campus life — from a dependable 5G phone to earbuds that survive the library and the gym. Every item links to a full review and the current best price.',
   'manual', NULL),
  ('best-under-5000',
   'Best Deals Under ₹5,000',
   'Proof that a tight budget still buys genuinely good products.',
   'Everything here costs **under ₹5,000** and earned a recommendation on merit, not just price. This hub updates automatically as prices change.',
   'price', '5000'),
  ('best-wireless-audio',
   'Best Wireless Audio',
   'Cut the cord without cutting corners — our tested wireless picks.',
   'Our favourite **wireless** audio gear, pulled together automatically from across our reviews.',
   'feature', 'Wireless');

-- Manual spokes for the students hub
INSERT INTO hub_deals (hub_id, deal_id, sort_order, note) VALUES
  ((SELECT id FROM hubs WHERE slug='best-tech-for-students'), (SELECT id FROM deals WHERE slug='redmi-13c-5g'), 1, 'A reliable 5G phone that lasts the day between lectures.'),
  ((SELECT id FROM hubs WHERE slug='best-tech-for-students'), (SELECT id FROM deals WHERE slug='boat-airdopes-141'), 2, 'Library-friendly earbuds with battery that survives finals week.'),
  ((SELECT id FROM hubs WHERE slug='best-tech-for-students'), (SELECT id FROM deals WHERE slug='noise-colorfit-pro-5'), 3, 'Keeps you on schedule and nudges you to move between study sessions.'),
  ((SELECT id FROM hubs WHERE slug='best-tech-for-students'), (SELECT id FROM deals WHERE slug='fire-tv-stick-4k'), 4, 'Turns a cheap hostel TV into a proper streaming setup for downtime.');

-- ============================================================
-- Blog enrichment: bylines, deks, read times on existing posts
-- ============================================================
UPDATE posts SET author='Aarav Mehta', author_role='Senior Audio Reviewer', read_minutes=7,
  dek='We bought and lived with the most popular budget TWS earbuds for weeks. Only two earned a spot on this list.'
  WHERE slug='best-budget-earbuds-under-2000';
UPDATE posts SET author='Priya Nair', author_role='Mobile & Telecom Editor', read_minutes=9,
  dek='5G under ₹15,000 is no longer a compromise. Here is exactly which phone to buy, and why.'
  WHERE slug='best-5g-phones-under-15000';
UPDATE posts SET author='Rohan Verma', author_role='Consumer Rights Writer', read_minutes=5,
  dek='That bright red "60% OFF" tag is often hiding a price that was never real. Here is the 60-second check that protects you.'
  WHERE slug='how-to-spot-a-fake-discount';
UPDATE posts SET author='Sneha Iyer', author_role='Kitchen & Appliances Lead', read_minutes=8,
  dek='From everyday dal to the toughest dry masala, here are the mixer grinders our test kitchen actually keeps using.'
  WHERE slug='best-mixer-grinder-india';

-- ============================================================
-- New product-focused blog content
-- ============================================================
INSERT INTO posts (slug, title, excerpt, body, cover_image, category_id, author, author_role, read_minutes, dek, post_type, pillar, published_at, updated_at) VALUES
  ('boat-airdopes-141-long-term-review',
   'boAt Airdopes 141, Six Months Later: Still the Budget King?',
   'We have used the boAt Airdopes 141 every single day for six months. Here is how they actually hold up beyond the honeymoon period.',
   '## The short answer\nAfter six months of daily abuse — gym, commute, calls, gaming — the **boAt Airdopes 141** remain the budget earbuds we recommend first. Battery degradation has been minimal, and the low-latency mode is still the best thing about them at this price.\n\n## What six months of real use looks like\nMost reviews judge earbuds in the first week, when everything is shiny. The interesting question is what happens after the case has been dropped a dozen times and the buds have lived in a sweaty gym bag.\n\nThe short version: they survived. The matte finish on our pair shows light scuffing, but the hinge is still tight, and the magnets still snap the buds into place satisfyingly.\n\n## Battery: the honest numbers\nWhen new, we measured close to **5 hours 40 minutes** per charge at 60% volume. Six months on, that is down to roughly **5 hours 10 minutes** — a normal, gentle decline, not the cliff-edge drop cheap batteries sometimes suffer.\n\n## Where they still shine\n- **Low-latency BEAST mode** keeps audio locked to video while gaming.\n- **IPX4 sweat resistance** has shrugged off every workout.\n- **Fast charging** genuinely delivers about 90 minutes of playback from a 5-minute top-up.\n\n## Where they fall short\n- **Call quality** in wind is still mediocre.\n- **No app** for EQ tuning — the sound is what it is.\n- The case **lacks wireless charging**, though that is expected here.\n\n## Should you buy them in 2026?\nYes — if your budget is firm at around ₹1,500, nothing we have tested beats them on the fundamentals. If you can stretch, read our earbuds roundup for a noise-cancelling alternative.\n\n## The verdict\nSix months in, the Airdopes 141 have earned their reputation. They are not exciting, but they are dependable — and at this price, dependable is exactly what you want.',
   'https://m.media-amazon.com/images/I/61u1VALn6JL._SL1500_.jpg',
   2, 'Aarav Mehta', 'Senior Audio Reviewer', 6,
   'Most reviews judge earbuds in week one. We judged these in month six — after the drops, the sweat, and the battery cycles.',
   'review', 0, '2026-06-08 10:00:00', '2026-06-15 10:00:00'),

  ('redmi-13c-5g-vs-oneplus-nord-ce4',
   'Redmi 13C 5G vs OnePlus Nord CE4: Which Budget 5G Phone Wins?',
   'One costs half as much as the other. We put the Redmi 13C 5G head-to-head with the OnePlus Nord CE4 to see where your money actually goes.',
   '## The short answer\nBuy the **Redmi 13C 5G** if your budget is tight and you mainly browse, message and watch video. Buy the **OnePlus Nord CE4** if you game, shoot a lot of photos, or simply want a phone that feels fast for the next three years.\n\n## Price and what it buys you\nThe gap between these two is significant, and it shows up exactly where you would expect: chipset, charging, and camera. The question is whether those upgrades matter for *your* use.\n\n## Performance\nThe Nord CE4 is in a different class here. Day-to-day, the Redmi 13C 5G is perfectly smooth for light use, but open a demanding game and the difference is obvious — sustained frame rates, faster app loads, and far less thermal throttling on the OnePlus.\n\n## Display\nBoth get you a large, fluid screen, but the Nord CE4 pushes higher brightness and a smoother panel that is noticeably nicer outdoors.\n\n## Battery and charging\nBoth last a full day. The headline difference is charging speed — the Nord CE4 refuels dramatically faster, which genuinely changes how you live with the phone.\n\n## Cameras\nIn good light, both are fine. Push into low light or fast-moving subjects and the Nord CE4 pulls clearly ahead.\n\n## Who should buy which?\n- **Choose the Redmi 13C 5G** for a dependable, no-drama budget 5G phone.\n- **Choose the OnePlus Nord CE4** if performance, charging and camera quality justify the extra spend.\n\n## The verdict\nThis is not really a fight — it is a budget decision. Both are good at their price. Match the phone to how you actually use it, not to the spec sheet.',
   'https://m.media-amazon.com/images/I/81X5cKQ8mGL._SL1500_.jpg',
   1, 'Priya Nair', 'Mobile & Telecom Editor', 8,
   'One costs roughly double the other. We spent two weeks with both to find out whether the extra money is real value or just marketing.',
   'comparison', 0, '2026-06-09 09:00:00', '2026-06-14 09:00:00'),

  ('fire-tv-stick-4k-setup-guide',
   'Fire TV Stick 4K: The Setup Guide That Gets It Right',
   'Unboxing a Fire TV Stick 4K is easy. Setting it up so it is actually fast, private and clutter-free takes a few extra steps. Here they are.',
   '## The short answer\nThe **Fire TV Stick 4K** is the easiest way to turn any HDMI TV into a proper 4K streaming machine. Spend ten minutes on the settings below and it will feel twice as good as the out-of-the-box experience.\n\n## Before you plug in\nUse the included HDMI extender if your ports are cramped — it improves Wi-Fi reception and stops the stick from blocking adjacent ports.\n\n## First-boot essentials\n1. **Connect to 5GHz Wi-Fi** if your router supports it — it makes 4K streaming far more stable.\n2. **Sign in** and let it update fully before you start installing apps.\n3. **Pair the remote** and run the audio/video setup so HDR and Dolby are enabled.\n\n## Make it fast\n- Turn off **app auto-launch / featured video** so the home screen stops auto-playing trailers.\n- Clear unused apps to keep the limited storage breathing.\n- Enable **Display mirroring** only when you need it.\n\n## Make it private\n- Disable **data monitoring** and interest-based ads in Settings → Preferences → Privacy.\n- Turn off **collect app usage data** if you would rather not share it.\n\n## Get the most from the remote\nThe voice button is genuinely useful — searching across apps by voice is faster than typing. Map the app shortcut buttons to services you actually use.\n\n## The verdict\nThe Fire TV Stick 4K is excellent value, but the default settings prioritise Amazon, not you. Ten minutes of tuning turns a good streamer into a great one.',
   'https://m.media-amazon.com/images/I/51TjJOTfslL._SL1000_.jpg',
   2, 'Kabir Shah', 'Smart Home & Streaming', 5,
   'Plugging it in is the easy part. These settings are what separate a cluttered, ad-heavy box from a fast, private streaming setup.',
   'guide', 0, '2026-06-10 12:00:00', '2026-06-10 12:00:00'),

  ('best-yoga-mat-buying-guide',
   'How to Choose a Yoga Mat That Actually Lasts',
   'Thickness, grip, material, length — buying a yoga mat is more confusing than it should be. This guide cuts through it in five minutes.',
   '## The short answer\nFor most people, a **6mm TPE mat** with a textured, non-slip surface is the right balance of cushioning and stability — and the **Boldfit yoga mat** is the one we recommend for value.\n\n## Thickness: the trade-off\n- **4mm**: Stable for standing poses, but hard on the knees.\n- **6mm**: The sweet spot — joint comfort without feeling like a trampoline.\n- **8mm+**: Plush, but wobbly for balance work; better for floor and restorative practice.\n\n## Material matters\n- **TPE**: Light, recyclable, good grip — our default recommendation.\n- **PVC**: Durable and grippy but less eco-friendly.\n- **Natural rubber**: Best grip, heavier, pricier, and not vegan if latex bothers you.\n\n## Grip and texture\nA mat that slips is dangerous and frustrating. Look for a textured surface that grips even when your palms sweat. If you do hot yoga, prioritise grip above everything.\n\n## Size and weight\nIf you are tall, check the length — many budget mats are shorter than you expect. If you carry it to class, weight matters more than you think.\n\n## How to make it last\n- Wipe it down after sweaty sessions.\n- Roll it with the top surface facing out to stop the edges curling.\n- Keep it out of direct sun, which degrades the foam.\n\n## The verdict\nDo not overthink it. A 6mm TPE mat with genuine grip covers 90% of people. Spend the saved money on classes, not marketing gimmicks.',
   'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=1200&q=80',
   5, 'Sneha Iyer', 'Fitness & Wellbeing', 5,
   'Thickness, grip, material, length — the choices are confusing on purpose. Here is the simple framework that gets you the right mat.',
   'guide', 1, '2026-06-11 08:00:00', '2026-06-11 08:00:00'),

  ('instant-pot-duo-first-week',
   'Instant Pot Duo: What Nobody Tells You in the First Week',
   'An Instant Pot can transform weeknight cooking — but only once you get past the intimidating first few uses. Here is what we wish we knew sooner.',
   '## The short answer\nThe **Instant Pot Duo** earns its counter space, but the first week is where most people give up. Get through these early hurdles and it becomes the appliance you reach for daily.\n\n## The water test (do it first)\nBefore cooking anything, run a plain **water test** to learn how pressurising and venting feels and sounds. It removes the fear factor instantly.\n\n## Understand "time to pressure"\nThe cook timer does not start until the pot reaches pressure. A "10-minute" recipe can take 25 minutes door-to-door. Once you expect this, the planning gets easy.\n\n## Natural release vs quick release\n- **Quick release**: Fast, dramatic steam — great for vegetables.\n- **Natural release**: Gentler, better for rice, dal and meat. Skipping it is the #1 cause of disappointing results.\n\n## The recipes that build confidence\nStart with **dal, rice, and boiled eggs**. They are forgiving, fast, and show off what the pot does best. Save the elaborate curries for week two.\n\n## Cleaning and care\n- The sealing ring absorbs smells — keep a spare and swap for sweet vs savoury cooking.\n- The inner pot is dishwasher-safe; the base is not — never immerse it.\n\n## The verdict\nThe Instant Pot Duo is not magic, it is a tool — and like any tool, the first week is about learning it. Push through, and it pays you back every single weeknight.',
   'https://m.media-amazon.com/images/I/71V1LrY1MSL._SL1500_.jpg',
   4, 'Sneha Iyer', 'Kitchen & Appliances Lead', 6,
   'The first week with a pressure cooker is where most people quit. These are the things we wish someone had told us on day one.',
   'review', 0, '2026-06-12 08:00:00', '2026-06-12 08:00:00'),

  ('smartwatch-vs-fitness-band',
   'Smartwatch or Fitness Band? How to Choose Without Overspending',
   'They track the same steps, but they are built for very different people. Here is how to decide before you spend a rupee.',
   '## The short answer\nBuy a **fitness band** if you mainly want activity and sleep tracking with multi-day battery. Buy a **smartwatch** like the Noise ColorFit Pro 5 if you want notifications, a big bright screen, and a more phone-like experience on your wrist.\n\n## What a band does best\n- **Battery life** measured in days, sometimes weeks.\n- **Lightweight** and unobtrusive for sleep tracking.\n- **Lower price** for the core health metrics.\n\n## What a smartwatch adds\n- A larger, brighter display you can actually read notifications on.\n- App-like features: music control, quick replies, mini widgets.\n- A more "device" feel — at the cost of charging more often.\n\n## Be honest about battery\nThis is the real dividing line. A smartwatch screen that big needs charging every few days. If charging another gadget annoys you, a band is the smarter pick.\n\n## Accuracy reality check\nFor steps, sleep and heart-rate *trends*, both are good enough. Neither is medical-grade — treat the numbers as guidance, not gospel.\n\n## Who should buy which?\n- **Band**: minimalists, runners, anyone who hates charging.\n- **Smartwatch**: notification junkies who want a glanceable screen.\n\n## The verdict\nThere is no universally better choice — only the better choice for your habits. Decide how much you care about screen size versus battery life, and the rest follows.',
   'https://m.media-amazon.com/images/I/61ZjlBOp+rL._SL1500_.jpg',
   2, 'Kabir Shah', 'Smart Home & Wearables', 6,
   'They track the same steps but suit very different people. The deciding factor is simpler than the spec sheets suggest.',
   'comparison', 1, '2026-06-13 09:00:00', '2026-06-13 09:00:00');

-- Link new pillar/comparison posts to relevant deals
INSERT INTO post_deals (post_id, deal_id, sort_order) VALUES
  ((SELECT id FROM posts WHERE slug='boat-airdopes-141-long-term-review'), (SELECT id FROM deals WHERE slug='boat-airdopes-141'), 1),
  ((SELECT id FROM posts WHERE slug='boat-airdopes-141-long-term-review'), (SELECT id FROM deals WHERE slug='realme-buds-air-6'), 2),
  ((SELECT id FROM posts WHERE slug='redmi-13c-5g-vs-oneplus-nord-ce4'), (SELECT id FROM deals WHERE slug='redmi-13c-5g'), 1),
  ((SELECT id FROM posts WHERE slug='redmi-13c-5g-vs-oneplus-nord-ce4'), (SELECT id FROM deals WHERE slug='oneplus-nord-ce4'), 2),
  ((SELECT id FROM posts WHERE slug='fire-tv-stick-4k-setup-guide'), (SELECT id FROM deals WHERE slug='fire-tv-stick-4k'), 1),
  ((SELECT id FROM posts WHERE slug='best-yoga-mat-buying-guide'), (SELECT id FROM deals WHERE slug='boldfit-yoga-mat'), 1),
  ((SELECT id FROM posts WHERE slug='instant-pot-duo-first-week'), (SELECT id FROM deals WHERE slug='instant-pot-duo'), 1),
  ((SELECT id FROM posts WHERE slug='smartwatch-vs-fitness-band'), (SELECT id FROM deals WHERE slug='noise-colorfit-pro-5'), 1),
  ((SELECT id FROM posts WHERE slug='smartwatch-vs-fitness-band'), (SELECT id FROM deals WHERE slug='boat-airdopes-141'), 2);

-- FAQs for new blogs (also feed FAQ structured data on listicles)
INSERT INTO faqs (parent_type, parent_id, question, answer, sort_order) VALUES
  ('post', (SELECT id FROM posts WHERE slug='boat-airdopes-141-long-term-review'), 'Do the boAt Airdopes 141 lose battery life over time?', 'Yes, but gently. After six months of daily use our pair dropped from about 5 hours 40 minutes to roughly 5 hours 10 minutes per charge — a normal, gradual decline rather than a sudden failure.', 1),
  ('post', (SELECT id FROM posts WHERE slug='boat-airdopes-141-long-term-review'), 'Are they good for the gym?', 'Yes. The IPX4 rating has handled months of sweaty workouts without issue, and the secure fit stays put during movement.', 2),
  ('post', (SELECT id FROM posts WHERE slug='redmi-13c-5g-vs-oneplus-nord-ce4'), 'Is the OnePlus Nord CE4 worth the extra money over the Redmi 13C 5G?', 'It is if you game, shoot a lot of photos, or want a phone that stays fast for years. For light browsing and messaging, the Redmi 13C 5G is the smarter value buy.', 1),
  ('post', (SELECT id FROM posts WHERE slug='redmi-13c-5g-vs-oneplus-nord-ce4'), 'Which one has better battery life?', 'Both comfortably last a full day. The OnePlus Nord CE4 wins decisively on charging speed, refuelling far faster than the Redmi.', 2),
  ('post', (SELECT id FROM posts WHERE slug='fire-tv-stick-4k-setup-guide'), 'How do I stop the Fire TV Stick from auto-playing trailers?', 'Go to Settings → Preferences → Featured Content and turn off both video and audio autoplay. The home screen becomes calm and instant.', 1),
  ('post', (SELECT id FROM posts WHERE slug='best-yoga-mat-buying-guide'), 'What thickness of yoga mat is best?', 'For most people a 6mm mat is ideal — enough cushioning to protect knees and joints while staying stable for balance poses.', 1),
  ('post', (SELECT id FROM posts WHERE slug='best-yoga-mat-buying-guide'), 'Is TPE or PVC better for a yoga mat?', 'TPE is lighter, more eco-friendly and offers great grip, which is why we recommend it for most buyers. PVC is slightly more durable but less environmentally friendly.', 2),
  ('post', (SELECT id FROM posts WHERE slug='instant-pot-duo-first-week'), 'Why does my Instant Pot take longer than the recipe says?', 'The cooking timer only starts once the pot reaches pressure, which can take 10–15 minutes. Always add this "time to pressure" to the stated cook time when planning.', 1),
  ('post', (SELECT id FROM posts WHERE slug='smartwatch-vs-fitness-band'), 'Is a smartwatch or fitness band better for sleep tracking?', 'A fitness band is usually better for sleep because it is lighter, more comfortable overnight, and lasts several days between charges so it is rarely off your wrist.', 1);
