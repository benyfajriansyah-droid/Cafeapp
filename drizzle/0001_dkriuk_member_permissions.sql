ALTER TABLE "members" ADD COLUMN "permissions" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "permissions" text DEFAULT '' NOT NULL;
