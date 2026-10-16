CREATE SEQUENCE IF NOT EXISTS "order_number_seq";

SELECT setval(
  'order_number_seq',
  COALESCE((SELECT MAX("order_number"::bigint) FROM "orders" WHERE "order_number" ~ '^[0-9]+$'), 0) + 1,
  false
);

ALTER TABLE "orders"
  ALTER COLUMN "order_number" SET DEFAULT nextval('order_number_seq')::text;
