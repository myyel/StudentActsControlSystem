CREATE TYPE "public"."behavior_scope" AS ENUM('school', 'home');--> statement-breakpoint
CREATE TYPE "public"."event_delete_reason" AS ENUM('undo', 'delete');--> statement-breakpoint
CREATE TABLE "behavior_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"behavior_type_id" uuid,
	"name_snapshot" varchar(40) NOT NULL,
	"icon_snapshot" varchar(16) NOT NULL,
	"points_snapshot" integer NOT NULL,
	"xp_delta" integer NOT NULL,
	"balance_delta" integer NOT NULL,
	"source" "behavior_scope" NOT NULL,
	"given_by_id" uuid,
	"note" varchar(200),
	"batch_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by_id" uuid,
	"delete_reason" "event_delete_reason",
	CONSTRAINT "behavior_event_student_batch_unique" UNIQUE("student_id","batch_id"),
	CONSTRAINT "behavior_event_xp_delta_check" CHECK ("behavior_event"."xp_delta" >= 0)
);
--> statement-breakpoint
CREATE TABLE "behavior_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"icon" varchar(16) NOT NULL,
	"points" integer NOT NULL,
	"scope" "behavior_scope" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "behavior_type_points_check" CHECK ("behavior_type"."points" <> 0 and "behavior_type"."points" between -10 and 10),
	CONSTRAINT "behavior_type_home_positive_check" CHECK ("behavior_type"."scope" <> 'home' or "behavior_type"."points" > 0)
);
--> statement-breakpoint
ALTER TABLE "behavior_event" ADD CONSTRAINT "behavior_event_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_event" ADD CONSTRAINT "behavior_event_class_id_class_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."class"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_event" ADD CONSTRAINT "behavior_event_behavior_type_id_behavior_type_id_fk" FOREIGN KEY ("behavior_type_id") REFERENCES "public"."behavior_type"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_event" ADD CONSTRAINT "behavior_event_given_by_id_user_id_fk" FOREIGN KEY ("given_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_event" ADD CONSTRAINT "behavior_event_deleted_by_id_user_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_type" ADD CONSTRAINT "behavior_type_class_id_class_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."class"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "behavior_event_student_id_created_at_index" ON "behavior_event" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "behavior_event_class_id_created_at_index" ON "behavior_event" USING btree ("class_id","created_at");--> statement-breakpoint
CREATE INDEX "behavior_event_batch_id_index" ON "behavior_event" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "behavior_type_class_id_scope_sort_order_index" ON "behavior_type" USING btree ("class_id","scope","sort_order");