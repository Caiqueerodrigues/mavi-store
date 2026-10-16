ALTER TABLE "sales_channels" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_channels" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_channels" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;