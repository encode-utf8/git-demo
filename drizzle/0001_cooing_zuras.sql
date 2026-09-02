CREATE TABLE IF NOT EXISTS "observability_metrics" (
	"key" text PRIMARY KEY NOT NULL,
	"metric_value" bigint DEFAULT 0 NOT NULL,
	"timestamp_value" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "klines" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "klines" ADD COLUMN "fetched_at" timestamp with time zone;
