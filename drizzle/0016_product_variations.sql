ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "variations" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "payment_date" date;
