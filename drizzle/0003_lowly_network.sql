PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_billing_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`invoice_no` text NOT NULL,
	`plan` text NOT NULL,
	`interval` text DEFAULT 'monthly' NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`due_date` text NOT NULL,
	`paid_at` text,
	`payment_method` text DEFAULT 'manual' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_billing_invoices`("id", "workspace_id", "invoice_no", "plan", "interval", "amount", "status", "due_date", "paid_at", "payment_method", "created_at") SELECT "id", "workspace_id", "invoice_no", "plan", "interval", "amount", "status", "due_date", "paid_at", "payment_method", "created_at" FROM `billing_invoices`;--> statement-breakpoint
DROP TABLE `billing_invoices`;--> statement-breakpoint
ALTER TABLE `__new_billing_invoices` RENAME TO `billing_invoices`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `billing_workspace_idx` ON `billing_invoices` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `__new_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`category` text NOT NULL,
	`amount` integer NOT NULL,
	`payment_method` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`transaction_date` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_expenses`("id", "workspace_id", "branch_id", "category", "amount", "payment_method", "note", "transaction_date", "is_demo", "created_at") SELECT "id", "workspace_id", "branch_id", "category", "amount", "payment_method", "note", "transaction_date", false AS "is_demo", "created_at" FROM `expenses`;--> statement-breakpoint
DROP TABLE `expenses`;--> statement-breakpoint
ALTER TABLE `__new_expenses` RENAME TO `expenses`;--> statement-breakpoint
CREATE INDEX `expenses_workspace_date_idx` ON `expenses` (`workspace_id`,`transaction_date`);--> statement-breakpoint
CREATE INDEX `expenses_branch_date_idx` ON `expenses` (`branch_id`,`transaction_date`);--> statement-breakpoint
CREATE TABLE `__new_order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` integer NOT NULL,
	`unit_cost` integer DEFAULT 0 NOT NULL,
	`subtotal` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_order_items`("id", "order_id", "product_id", "product_name", "quantity", "unit_price", "unit_cost", "subtotal") SELECT "id", "order_id", "product_id", "product_name", "quantity", "unit_price", "unit_cost", "subtotal" FROM `order_items`;--> statement-breakpoint
DROP TABLE `order_items`;--> statement-breakpoint
ALTER TABLE `__new_order_items` RENAME TO `order_items`;--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `__new_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`order_no` text NOT NULL,
	`channel` text DEFAULT 'Dine in' NOT NULL,
	`payment_method` text NOT NULL,
	`subtotal` integer NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`tax` integer DEFAULT 0 NOT NULL,
	`total` integer NOT NULL,
	`status` text DEFAULT 'paid' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`customer_name` text DEFAULT '' NOT NULL,
	`customer_phone` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`cashier_email` text DEFAULT '' NOT NULL,
	`voided_at` text,
	`voided_by` text DEFAULT '' NOT NULL,
	`void_reason` text DEFAULT '' NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_orders`("id", "workspace_id", "branch_id", "order_no", "channel", "payment_method", "subtotal", "discount", "tax", "total", "status", "created_at", "customer_name", "customer_phone", "notes", "cashier_email", "voided_at", "voided_by", "void_reason", "is_demo") SELECT "id", "workspace_id", "branch_id", "order_no", "channel", "payment_method", "subtotal", "discount", 0 AS "tax", "total", "status", "created_at", "customer_name", "customer_phone", "notes", '' AS "cashier_email", NULL AS "voided_at", '' AS "voided_by", '' AS "void_reason", false AS "is_demo" FROM `orders`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
CREATE INDEX `orders_workspace_created_idx` ON `orders` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_branch_created_idx` ON `orders` (`branch_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `__new_products` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`category` text NOT NULL,
	`price` integer NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_products`("id", "workspace_id", "name", "sku", "category", "price", "cost", "is_active", "is_demo", "created_at") SELECT "id", "workspace_id", "name", "sku", "category", "price", "cost", "is_active", false AS "is_demo", "created_at" FROM `products`;--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
ALTER TABLE `__new_products` RENAME TO `products`;--> statement-breakpoint
CREATE INDEX `products_workspace_idx` ON `products` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `__new_shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`cashier_name` text NOT NULL,
	`opening_cash` integer DEFAULT 0 NOT NULL,
	`actual_cash` integer,
	`expected_cash` integer,
	`variance` integer,
	`status` text DEFAULT 'open' NOT NULL,
	`opened_by` text DEFAULT '' NOT NULL,
	`closed_by` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`opened_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`closed_at` text
);
--> statement-breakpoint
INSERT INTO `__new_shifts`("id", "workspace_id", "branch_id", "cashier_name", "opening_cash", "actual_cash", "expected_cash", "variance", "status", "opened_by", "closed_by", "note", "is_demo", "opened_at", "closed_at") SELECT "id", "workspace_id", "branch_id", "cashier_name", "opening_cash", "actual_cash", NULL AS "expected_cash", "variance", "status", '' AS "opened_by", '' AS "closed_by", '' AS "note", false AS "is_demo", "opened_at", "closed_at" FROM `shifts`;--> statement-breakpoint
DROP TABLE `shifts`;--> statement-breakpoint
ALTER TABLE `__new_shifts` RENAME TO `shifts`;--> statement-breakpoint
CREATE INDEX `shifts_workspace_idx` ON `shifts` (`workspace_id`,`opened_at`);--> statement-breakpoint
CREATE INDEX `shifts_branch_status_idx` ON `shifts` (`branch_id`,`status`);--> statement-breakpoint
CREATE TABLE `__new_subscription_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`checkout_reference` text NOT NULL,
	`orderhero_invoice` text DEFAULT '' NOT NULL,
	`buyer_name` text NOT NULL,
	`buyer_email` text NOT NULL,
	`buyer_phone` text NOT NULL,
	`plan` text NOT NULL,
	`interval` text DEFAULT 'monthly' NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'checkout_started' NOT NULL,
	`reviewer_email` text DEFAULT '' NOT NULL,
	`review_note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text,
	`activated_at` text
);
--> statement-breakpoint
INSERT INTO `__new_subscription_claims`("id", "workspace_id", "checkout_reference", "orderhero_invoice", "buyer_name", "buyer_email", "buyer_phone", "plan", "interval", "amount", "status", "reviewer_email", "review_note", "created_at", "reviewed_at", "activated_at") SELECT "id", "workspace_id", "checkout_reference", "orderhero_invoice", "buyer_name", "buyer_email", "buyer_phone", "plan", "interval", "amount", "status", "reviewer_email", '' AS "review_note", "created_at", "reviewed_at", "activated_at" FROM `subscription_claims`;--> statement-breakpoint
DROP TABLE `subscription_claims`;--> statement-breakpoint
ALTER TABLE `__new_subscription_claims` RENAME TO `subscription_claims`;--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_claims_checkout_reference_unique` ON `subscription_claims` (`checkout_reference`);--> statement-breakpoint
CREATE INDEX `subscription_claims_status_idx` ON `subscription_claims` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `subscription_claims_workspace_idx` ON `subscription_claims` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `subscription_claims_email_idx` ON `subscription_claims` (`buyer_email`);--> statement-breakpoint
ALTER TABLE `branches` ADD `is_demo` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `is_active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `is_demo` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `is_demo` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `paid_plan` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `current_period_end` text;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `cashier_discount_percent` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `recipes_product_ingredient_unique` ON `recipes` (`product_id`,`ingredient_id`);--> statement-breakpoint
-- Backfill: workspace yang paketnya benar-benar sudah disetujui admin sebelum kolom
-- `paid_plan` ada. Kriterianya sengaja ketat — harus punya klaim OrderHero berstatus
-- `activated`, bukan sekadar `subscription_status = 'active'`, karena status itu dulu
-- bisa diubah sendiri oleh pengguna lewat `select-plan`.
UPDATE `workspaces` SET
  `paid_plan` = `plan`,
  `current_period_end` = (
    SELECT datetime(
      COALESCE(c.`activated_at`, c.`created_at`),
      CASE WHEN c.`interval` = 'yearly' THEN '+1 year' ELSE '+1 month' END
    )
    FROM `subscription_claims` c
    WHERE c.`workspace_id` = `workspaces`.`id` AND c.`status` = 'activated'
    ORDER BY c.`activated_at` DESC LIMIT 1
  )
WHERE `paid_plan` = ''
  AND `plan` IN ('starter', 'pro', 'business')
  AND EXISTS (
    SELECT 1 FROM `subscription_claims` c
    WHERE c.`workspace_id` = `workspaces`.`id` AND c.`status` = 'activated'
  );
--> statement-breakpoint
-- Workspace yang statusnya 'active' tanpa klaim yang pernah disetujui dikembalikan ke
-- keadaan sebenarnya: belum bayar. Masa uji cobanya tetap dihormati.
UPDATE `workspaces` SET `subscription_status` = 'trialing'
WHERE `subscription_status` = 'active' AND `paid_plan` = '';
