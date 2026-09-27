CREATE TABLE "character_level" (
	"school_id" uuid NOT NULL,
	"level" smallint NOT NULL,
	"xp_threshold" integer NOT NULL,
	CONSTRAINT "character_level_school_id_level_pk" PRIMARY KEY("school_id","level"),
	CONSTRAINT "character_level_level_check" CHECK ("character_level"."level" between 1 and 5),
	CONSTRAINT "character_level_threshold_check" CHECK ("character_level"."xp_threshold" >= 0)
);
--> statement-breakpoint
CREATE TABLE "character_stage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_type_id" uuid NOT NULL,
	"level" smallint NOT NULL,
	"name" varchar(40) NOT NULL,
	"asset_url" text NOT NULL,
	CONSTRAINT "character_stage_type_level_unique" UNIQUE("character_type_id","level"),
	CONSTRAINT "character_stage_level_check" CHECK ("character_stage"."level" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "character_level" ADD CONSTRAINT "character_level_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."school"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_stage" ADD CONSTRAINT "character_stage_character_type_id_character_type_id_fk" FOREIGN KEY ("character_type_id") REFERENCES "public"."character_type"("id") ON DELETE cascade ON UPDATE no action;