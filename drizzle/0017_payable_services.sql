CREATE TABLE IF NOT EXISTS "payable_services" (
  "id" serial PRIMARY KEY NOT NULL,
  "order_date" date NOT NULL,
  "delivery_date" date,
  "agreed_amount" numeric(12, 2) NOT NULL,
  "quantity" integer NOT NULL,
  "service_type_id" integer,
  "service_type_name" varchar(100) NOT NULL,
  "recipient_name" varchar(160) NOT NULL,
  "total_amount" numeric(12, 2) NOT NULL,
  "payment_date" date,
  "payment_status" varchar(20) DEFAULT 'pending' NOT NULL,
  "created_by" integer,
  "updated_by" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "payable_services_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "payable_services_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "payable_services_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "payable_services_payment_status_check" CHECK ("payment_status" IN ('pending', 'paid', 'cancelled')),
  CONSTRAINT "payable_services_payment_date_check" CHECK ("payment_status" <> 'paid' OR "payment_date" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "payable_services" ADD COLUMN IF NOT EXISTS "quantity" integer;
--> statement-breakpoint
UPDATE "payable_services" SET "quantity" = 1 WHERE "quantity" IS NULL;
--> statement-breakpoint
ALTER TABLE "payable_services" ALTER COLUMN "quantity" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payable_services" ADD COLUMN IF NOT EXISTS "recipient_name" varchar(160);
--> statement-breakpoint
UPDATE "payable_services" SET "recipient_name" = 'Não informado' WHERE "recipient_name" IS NULL;
--> statement-breakpoint
ALTER TABLE "payable_services" ALTER COLUMN "recipient_name" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payable_services_order_date" ON "payable_services" USING btree ("order_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payable_services_payment_status" ON "payable_services" USING btree ("payment_status");
