CREATE TABLE "class_character_stage_name" (
	"class_id" uuid NOT NULL,
	"character_type_id" uuid NOT NULL,
	"level" smallint NOT NULL,
	"name" varchar(40) NOT NULL,
	CONSTRAINT "class_character_stage_name_class_id_character_type_id_level_pk" PRIMARY KEY("class_id","character_type_id","level"),
	CONSTRAINT "class_character_stage_name_level_check" CHECK ("class_character_stage_name"."level" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "class_character_type" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "class_character_stage_name" ADD CONSTRAINT "class_character_stage_name_class_id_class_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."class"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_character_stage_name" ADD CONSTRAINT "class_character_stage_name_character_type_id_character_type_id_fk" FOREIGN KEY ("character_type_id") REFERENCES "public"."character_type"("id") ON DELETE cascade ON UPDATE no action;