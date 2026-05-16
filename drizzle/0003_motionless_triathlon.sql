CREATE TABLE `tithe_commitments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`income_transaction_id` integer NOT NULL,
	`date` text NOT NULL,
	`income_amount` real NOT NULL,
	`income_currency` text NOT NULL,
	`income_trm` real NOT NULL,
	`income_amount_base` real NOT NULL,
	`tithe_percent` real NOT NULL,
	`offering_percent` real NOT NULL,
	`tithe_amount` real NOT NULL,
	`offering_amount` real NOT NULL,
	`total_amount` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`tithe_payment_id` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tithe_payments` ADD `amount_cop` real;--> statement-breakpoint
ALTER TABLE `tithe_payments` ADD `currency` text DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE `tithe_payments` ADD `attachment_url` text;