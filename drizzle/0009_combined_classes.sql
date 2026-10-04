ALTER TABLE "class" ADD COLUMN "grade_levels" smallint[] DEFAULT '{}'::smallint[] NOT NULL;--> statement-breakpoint
ALTER TABLE "student" ADD COLUMN "grade_level" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "subject" ADD COLUMN "grade_level" smallint;--> statement-breakpoint
-- Backfill before the checks: existing classes keep their single level, students inherit it.
UPDATE "class" SET "grade_levels" = ARRAY["grade_level"]::smallint[];--> statement-breakpoint
UPDATE "student" SET "grade_level" = "class"."grade_level" FROM "class" WHERE "class"."id" = "student"."class_id";--> statement-breakpoint
ALTER TABLE "class" ADD CONSTRAINT "class_grade_levels_check" CHECK (cardinality("class"."grade_levels") between 1 and 4 and "class"."grade_levels" <@ '{1,2,3,4}'::smallint[]);--> statement-breakpoint
ALTER TABLE "student" ADD CONSTRAINT "student_grade_level_check" CHECK ("student"."grade_level" between 1 and 4);--> statement-breakpoint
ALTER TABLE "subject" ADD CONSTRAINT "subject_grade_level_check" CHECK ("subject"."grade_level" between 1 and 4);