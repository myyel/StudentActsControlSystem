ALTER TABLE "class" DROP CONSTRAINT "class_grade_level_check";--> statement-breakpoint
ALTER TABLE "class" ALTER COLUMN "grade_levels" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "student" ALTER COLUMN "grade_level" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "class" DROP COLUMN "grade_level";