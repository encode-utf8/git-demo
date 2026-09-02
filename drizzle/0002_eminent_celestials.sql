CREATE TABLE "watchlist" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"exchange" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"note" text,
	"added_at" timestamp with time zone NOT NULL
);
