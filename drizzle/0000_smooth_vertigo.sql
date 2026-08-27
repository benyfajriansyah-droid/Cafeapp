CREATE TABLE "billing_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"invoice_no" text NOT NULL,
	"plan" text NOT NULL,
	"interval" text DEFAULT 'monthly' NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"due_date" text NOT NULL,
	"paid_at" text,
	"payment_method" text DEFAULT 'manual' NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"category" text NOT NULL,
	"amount" integer NOT NULL,
	"payment_method" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"transaction_date" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"stock_qty" double precision DEFAULT 0 NOT NULL,
	"minimum_stock" double precision DEFAULT 0 NOT NULL,
	"average_cost" double precision DEFAULT 0 NOT NULL,
	"supplier" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'cashier' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"invited_by" text DEFAULT '' NOT NULL,
	"expires_at" text NOT NULL,
	"accepted_at" text,
	"revoked_at" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'cashier' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"invited_by" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" double precision NOT NULL,
	"unit_price" integer NOT NULL,
	"unit_cost" integer DEFAULT 0 NOT NULL,
	"subtotal" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"order_no" text NOT NULL,
	"channel" text DEFAULT 'Dine in' NOT NULL,
	"payment_method" text NOT NULL,
	"subtotal" integer NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"tax" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"customer_name" text DEFAULT '' NOT NULL,
	"customer_phone" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"cashier_email" text DEFAULT '' NOT NULL,
	"voided_at" text,
	"voided_by" text DEFAULT '' NOT NULL,
	"void_reason" text DEFAULT '' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" text NOT NULL,
	"used_at" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"category" text NOT NULL,
	"price" integer NOT NULL,
	"cost" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"product_id" text NOT NULL,
	"ingredient_id" text NOT NULL,
	"quantity" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" text NOT NULL,
	"last_seen_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"cashier_name" text NOT NULL,
	"opening_cash" integer DEFAULT 0 NOT NULL,
	"actual_cash" integer,
	"expected_cash" integer,
	"variance" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"opened_by" text DEFAULT '' NOT NULL,
	"closed_by" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"opened_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"closed_at" text
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"ingredient_id" text NOT NULL,
	"type" text NOT NULL,
	"quantity" double precision NOT NULL,
	"unit_cost" double precision DEFAULT 0 NOT NULL,
	"supplier" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"checkout_reference" text NOT NULL,
	"orderhero_invoice" text DEFAULT '' NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_email" text NOT NULL,
	"buyer_phone" text NOT NULL,
	"plan" text NOT NULL,
	"interval" text DEFAULT 'monthly' NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'checkout_started' NOT NULL,
	"reviewer_email" text DEFAULT '' NOT NULL,
	"review_note" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"reviewed_at" text,
	"activated_at" text,
	CONSTRAINT "subscription_claims_checkout_reference_unique" UNIQUE("checkout_reference")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" text,
	"last_login_at" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_email" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"plan" text DEFAULT 'trial' NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"tax_percent" double precision DEFAULT 0 NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"business_type" text DEFAULT 'coffee-home' NOT NULL,
	"onboarding_completed" boolean DEFAULT true NOT NULL,
	"subscription_status" text DEFAULT 'trialing' NOT NULL,
	"trial_ends_at" text,
	"billing_interval" text DEFAULT 'monthly' NOT NULL,
	"paid_plan" text DEFAULT '' NOT NULL,
	"current_period_end" text,
	"cashier_discount_percent" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	CONSTRAINT "workspaces_owner_email_unique" UNIQUE("owner_email")
);
--> statement-breakpoint
CREATE INDEX "billing_workspace_idx" ON "billing_invoices" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "branches_workspace_idx" ON "branches" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "expenses_workspace_date_idx" ON "expenses" USING btree ("workspace_id","transaction_date");--> statement-breakpoint
CREATE INDEX "expenses_branch_date_idx" ON "expenses" USING btree ("branch_id","transaction_date");--> statement-breakpoint
CREATE INDEX "ingredients_workspace_idx" ON "ingredients" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "invitations_workspace_idx" ON "invitations" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "members_workspace_email_unique" ON "members" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "members_email_idx" ON "members" USING btree ("email");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_workspace_created_idx" ON "orders" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_branch_created_idx" ON "orders" USING btree ("branch_id","created_at");--> statement-breakpoint
CREATE INDEX "password_resets_user_idx" ON "password_resets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "products_workspace_idx" ON "products" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "recipes_product_idx" ON "recipes" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_product_ingredient_unique" ON "recipes" USING btree ("product_id","ingredient_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "shifts_workspace_idx" ON "shifts" USING btree ("workspace_id","opened_at");--> statement-breakpoint
CREATE INDEX "shifts_branch_status_idx" ON "shifts" USING btree ("branch_id","status");--> statement-breakpoint
CREATE INDEX "stock_movements_workspace_idx" ON "stock_movements" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "subscription_claims_status_idx" ON "subscription_claims" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "subscription_claims_workspace_idx" ON "subscription_claims" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "subscription_claims_email_idx" ON "subscription_claims" USING btree ("buyer_email");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");