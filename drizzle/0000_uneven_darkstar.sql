CREATE TABLE "analysis_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"data_snapshot" jsonb,
	"news_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content" text NOT NULL,
	"risk_note" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"job_name" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "klines" (
	"code" text NOT NULL,
	"period" text NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"open" double precision NOT NULL,
	"high" double precision NOT NULL,
	"low" double precision NOT NULL,
	"close" double precision NOT NULL,
	"volume" double precision NOT NULL,
	"amount" double precision NOT NULL,
	"adj_type" text NOT NULL,
	CONSTRAINT "klines_code_period_ts_adj_type_pk" PRIMARY KEY("code","period","ts","adj_type")
);
--> statement-breakpoint
CREATE TABLE "market_quotes" (
	"code" text NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"price" double precision NOT NULL,
	"change_pct" double precision NOT NULL,
	"open" double precision NOT NULL,
	"high" double precision NOT NULL,
	"low" double precision NOT NULL,
	"prev_close" double precision NOT NULL,
	"volume" double precision NOT NULL,
	"amount" double precision NOT NULL,
	"turnover_rate" double precision,
	"pe" double precision,
	"pb" double precision,
	"market_cap" double precision,
	"float_cap" double precision,
	"source" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "market_quotes_code_ts_pk" PRIMARY KEY("code","ts")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tool_calls" jsonb,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_items" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"url" text NOT NULL,
	"source" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"sentiment" text NOT NULL,
	"confidence" double precision NOT NULL,
	"impact_days" integer NOT NULL,
	"expire_at" timestamp with time zone NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stocks" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"exchange" text NOT NULL,
	"industry" text,
	"meta" jsonb
);
--> statement-breakpoint
CREATE INDEX "analysis_reports_code_created_idx" ON "analysis_reports" USING btree ("code","created_at");--> statement-breakpoint
CREATE INDEX "conversations_code_created_idx" ON "conversations" USING btree ("code","created_at");--> statement-breakpoint
CREATE INDEX "job_runs_name_started_idx" ON "job_runs" USING btree ("job_name","started_at");--> statement-breakpoint
CREATE INDEX "klines_code_period_ts_idx" ON "klines" USING btree ("code","period","ts");--> statement-breakpoint
CREATE INDEX "market_quotes_code_fetched_idx" ON "market_quotes" USING btree ("code","fetched_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "news_items_code_expire_idx" ON "news_items" USING btree ("code","expire_at");--> statement-breakpoint
CREATE INDEX "news_items_status_expire_idx" ON "news_items" USING btree ("status","expire_at");