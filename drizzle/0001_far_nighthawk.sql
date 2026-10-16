ALTER TABLE "service_types" ADD COLUMN "base_price" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
INSERT INTO "service_types" ("name", "base_price", "active") VALUES
  ('PESPONTO', 1.50, true),
  ('WASTER', 0.60, true),
  ('MONTAGEM', 3.50, true)
ON CONFLICT ("name") DO UPDATE SET
  "base_price" = EXCLUDED."base_price",
  "active" = true,
  "updated_at" = NOW();
