CREATE TABLE "class_activity" (
	"class_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"time" time(0) NOT NULL,
	"name" varchar(60) NOT NULL,
	CONSTRAINT "class_activity_class_id_weekday_pk" PRIMARY KEY("class_id","weekday"),
	CONSTRAINT "class_activity_weekday_check" CHECK ("class_activity"."weekday" between 1 and 7)
);
--> statement-breakpoint
ALTER TABLE "class_activity" ADD CONSTRAINT "class_activity_class_id_class_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."class"("id") ON DELETE cascade ON UPDATE no action;