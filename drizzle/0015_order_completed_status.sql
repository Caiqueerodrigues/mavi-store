ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_status_check";
--> statement-breakpoint
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_status_check"
  CHECK ("status" IN ('pending', 'in_production', 'ready', 'delivered', 'completed', 'cancelled'));
--> statement-breakpoint
INSERT INTO "service_types" ("name", "base_price", "active")
VALUES ('MONTAGEM + WASTER', 4.10, true)
ON CONFLICT ("name") DO UPDATE SET "base_price" = EXCLUDED."base_price";
