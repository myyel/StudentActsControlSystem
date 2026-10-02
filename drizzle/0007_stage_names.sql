-- New original character art (v0.36): stage names follow the new pictures. Only built-in stages
-- (asset url) that still carry the old default name are renamed; names an admin changed stay.
UPDATE "character_stage" SET "name" = 'Gizemli yumurta' WHERE "asset_url" = '/characters/ejderha/1.svg' AND "name" = 'Benekli yumurta';--> statement-breakpoint
UPDATE "character_stage" SET "name" = 'Pofuduk yavru' WHERE "asset_url" = '/characters/baykus/2.svg' AND "name" = 'Tüylü yavru';--> statement-breakpoint
UPDATE "character_stage" SET "name" = 'Meraklı baykuş' WHERE "asset_url" = '/characters/baykus/3.svg' AND "name" = 'Küçük baykuş';--> statement-breakpoint
UPDATE "character_stage" SET "name" = 'Kitapsever baykuş' WHERE "asset_url" = '/characters/baykus/4.svg' AND "name" = 'Dal üstünde baykuş';--> statement-breakpoint
UPDATE "character_stage" SET "name" = 'Parça kutusu' WHERE "asset_url" = '/characters/robot/1.svg' AND "name" = 'Minik dişli';--> statement-breakpoint
UPDATE "character_stage" SET "name" = 'Mini robot' WHERE "asset_url" = '/characters/robot/2.svg' AND "name" = 'Kutu robot';--> statement-breakpoint
UPDATE "character_stage" SET "name" = 'Yardımcı robot' WHERE "asset_url" = '/characters/robot/3.svg' AND "name" = 'Antenli robot';--> statement-breakpoint
UPDATE "character_stage" SET "name" = 'Kalpli robot' WHERE "asset_url" = '/characters/robot/4.svg' AND "name" = 'Yürüyen robot';--> statement-breakpoint
UPDATE "character_stage" SET "name" = 'Süper robot' WHERE "asset_url" = '/characters/robot/5.svg' AND "name" = 'Uçan robot';--> statement-breakpoint
UPDATE "character_stage" SET "name" = 'Çiçekli ağaç' WHERE "asset_url" = '/characters/tohum/5.svg' AND "name" = 'Meyveli ağaç';
