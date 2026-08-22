CREATE TABLE `platform_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscription_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`checkout_reference` text NOT NULL,
	`orderhero_invoice` text DEFAULT '' NOT NULL,
	`buyer_name` text NOT NULL,
	`buyer_email` text NOT NULL,
	`buyer_phone` text NOT NULL,
	`plan` text NOT NULL,
	`interval` text DEFAULT 'monthly' NOT NULL,
	`amount` real NOT NULL,
	`status` text DEFAULT 'checkout_started' NOT NULL,
	`reviewer_email` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text,
	`activated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_claims_checkout_reference_unique` ON `subscription_claims` (`checkout_reference`);--> statement-breakpoint
CREATE INDEX `subscription_claims_status_idx` ON `subscription_claims` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `subscription_claims_workspace_idx` ON `subscription_claims` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `subscription_claims_email_idx` ON `subscription_claims` (`buyer_email`);