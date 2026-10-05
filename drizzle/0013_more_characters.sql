-- Six more built-in character types (v0.40): Kedi, Tavşan, Penguen, Tilki, Kaplumbağa, Ahtapot.
-- Every existing school gets its own copy with the five stages (new schools get them from
-- createSchool). A school that already has one of these pictures is skipped.
WITH v(slug, name, sort) AS (
  VALUES
    ('kedi', 'Kedi', 5),
    ('tavsan', 'Tavşan', 6),
    ('penguen', 'Penguen', 7),
    ('tilki', 'Tilki', 8),
    ('kaplumbaga', 'Kaplumbağa', 9),
    ('ahtapot', 'Ahtapot', 10)
),
ins AS (
  INSERT INTO "character_type" ("school_id", "name", "sort_order")
  SELECT s."id", v."name", v."sort"
  FROM "school" s CROSS JOIN v
  WHERE NOT EXISTS (
    SELECT 1 FROM "character_type" ct
    JOIN "character_stage" cs ON cs."character_type_id" = ct."id"
    WHERE ct."school_id" = s."id" AND cs."asset_url" = '/characters/' || v."slug" || '/1.svg'
  )
  RETURNING "id", "name"
)
INSERT INTO "character_stage" ("character_type_id", "level", "name", "asset_url")
SELECT ins."id", st."level"::smallint, st."name", '/characters/' || v."slug" || '/' || st."level" || '.svg'
FROM ins
JOIN v ON v."name" = ins."name"
JOIN (VALUES
  ('kedi', 1, 'Sepetteki yavru'),
  ('kedi', 2, 'Minik kedi'),
  ('kedi', 3, 'Oyuncu kedi'),
  ('kedi', 4, 'Fiyonklu kedi'),
  ('kedi', 5, 'Bilge kedi'),
  ('tavsan', 1, 'Yuvadaki yavru'),
  ('tavsan', 2, 'Pamuk yavru'),
  ('tavsan', 3, 'Zıpzıp tavşan'),
  ('tavsan', 4, 'Çiçekli tavşan'),
  ('tavsan', 5, 'Bilge tavşan'),
  ('penguen', 1, 'Buzlu yumurta'),
  ('penguen', 2, 'Pofuduk yavru'),
  ('penguen', 3, 'Meraklı penguen'),
  ('penguen', 4, 'Atkılı penguen'),
  ('penguen', 5, 'Kral penguen'),
  ('tilki', 1, 'Yapraklı yuva'),
  ('tilki', 2, 'Yavru tilki'),
  ('tilki', 3, 'Çevik tilki'),
  ('tilki', 4, 'Kaşif tilki'),
  ('tilki', 5, 'Bilge tilki'),
  ('kaplumbaga', 1, 'Kumdaki yumurta'),
  ('kaplumbaga', 2, 'Minik kaplumbağa'),
  ('kaplumbaga', 3, 'Yürüyen kaplumbağa'),
  ('kaplumbaga', 4, 'Çiçekli kaplumbağa'),
  ('kaplumbaga', 5, 'Bilge kaplumbağa'),
  ('ahtapot', 1, 'Deniz kabuğu'),
  ('ahtapot', 2, 'Minik ahtapot'),
  ('ahtapot', 3, 'Neşeli ahtapot'),
  ('ahtapot', 4, 'Dalgıç ahtapot'),
  ('ahtapot', 5, 'Bilge ahtapot')
) st(slug, level, name) ON st."slug" = v."slug";
