CREATE TABLE "teaser_runs" (
	"id" serial PRIMARY KEY,
	"opinion" text NOT NULL,
	"decision_log" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
