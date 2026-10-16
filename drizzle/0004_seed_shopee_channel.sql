INSERT INTO "sales_channels" ("name", "percentage_fee", "fixed_fee", "active")
VALUES ('Shopee', 0.20, 4.50, true)
ON CONFLICT ("name") DO UPDATE SET
  "percentage_fee" = EXCLUDED."percentage_fee",
  "fixed_fee" = EXCLUDED."fixed_fee",
  "active" = true,
  "updated_at" = now();
