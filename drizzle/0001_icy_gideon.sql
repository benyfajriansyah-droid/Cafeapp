CREATE TABLE `billing_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`invoice_no` text NOT NULL,
	`plan` text NOT NULL,
	`interval` text DEFAULT 'monthly' NOT NULL,
	`amount` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`due_date` text NOT NULL,
	`paid_at` text,
	`payment_method` text DEFAULT 'manual' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `billing_workspace_idx` ON `billing_invoices` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`role` text DEFAULT 'cashier' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`invited_by` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_workspace_email_unique` ON `members` (`workspace_id`,`email`);--> statement-breakpoint
CREATE INDEX `members_email_idx` ON `members` (`email`);--> statement-breakpoint
ALTER TABLE `orders` ADD `customer_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `customer_phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `business_type` text DEFAULT 'coffee-home' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `onboarding_completed` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `subscription_status` text DEFAULT 'trialing' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `trial_ends_at` text;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `billing_interval` text DEFAULT 'monthly' NOT NULL;