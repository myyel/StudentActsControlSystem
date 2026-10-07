CREATE TABLE "student_character_completion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"character_type_id" uuid NOT NULL,
	"level" smallint NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "school" ADD COLUMN "character_complete_xp" integer;--> statement-breakpoint
ALTER TABLE "class" ADD COLUMN "character_complete_xp" integer;--> statement-breakpoint
ALTER TABLE "student" ADD COLUMN "character_xp_base" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "student_character_completion" ADD CONSTRAINT "student_character_completion_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_character_completion" ADD CONSTRAINT "student_character_completion_character_type_id_character_type_id_fk" FOREIGN KEY ("character_type_id") REFERENCES "public"."character_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "student_character_completion_student_id_index" ON "student_character_completion" USING btree ("student_id");--> statement-breakpoint
-- Students already past the last level start the wait for their next character from that level,
-- so years of XP do not complete several characters with one score.
UPDATE "student" s
SET "character_xp_base" = s."xp" - t."last"
FROM (
  SELECT c."id" AS "class_id",
    coalesce(
      (SELECT max(l."xp_threshold") FROM "class_character_level" l WHERE l."class_id" = c."id" HAVING count(*) >= 2),
      (SELECT max(l."xp_threshold") FROM "character_level" l WHERE l."school_id" = c."school_id" HAVING count(*) = 5),
      200
    ) AS "last"
  FROM "class" c
) t
WHERE s."class_id" = t."class_id" AND s."xp" > t."last";
