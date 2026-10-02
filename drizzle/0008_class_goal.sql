CREATE TABLE "class_goal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"title" varchar(60) NOT NULL,
	"target" integer NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_by_id" uuid,
	CONSTRAINT "class_goal_target_check" CHECK ("class_goal"."target" between 5 and 1000)
);
--> statement-breakpoint
ALTER TABLE "class_goal" ADD CONSTRAINT "class_goal_class_id_class_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."class"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_goal" ADD CONSTRAINT "class_goal_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "class_goal_open_class" ON "class_goal" USING btree ("class_id") WHERE "class_goal"."ended_at" is null;