CREATE TABLE "class_character_level" (
	"class_id" uuid NOT NULL,
	"level" smallint NOT NULL,
	"xp_threshold" integer NOT NULL,
	CONSTRAINT "class_character_level_class_id_level_pk" PRIMARY KEY("class_id","level"),
	CONSTRAINT "class_character_level_level_check" CHECK ("class_character_level"."level" between 1 and 5),
	CONSTRAINT "class_character_level_threshold_check" CHECK ("class_character_level"."xp_threshold" >= 0)
);
--> statement-breakpoint
CREATE TABLE "class_character_type" (
	"class_id" uuid NOT NULL,
	"character_type_id" uuid NOT NULL,
	CONSTRAINT "class_character_type_class_id_character_type_id_pk" PRIMARY KEY("class_id","character_type_id")
);
--> statement-breakpoint
ALTER TABLE "class_character_level" ADD CONSTRAINT "class_character_level_class_id_class_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."class"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_character_type" ADD CONSTRAINT "class_character_type_class_id_class_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."class"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_character_type" ADD CONSTRAINT "class_character_type_character_type_id_character_type_id_fk" FOREIGN KEY ("character_type_id") REFERENCES "public"."character_type"("id") ON DELETE cascade ON UPDATE no action;