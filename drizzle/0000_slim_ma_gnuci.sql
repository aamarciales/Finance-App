CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`icon` text NOT NULL,
	`type` text NOT NULL,
	`is_system` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `debts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`creditor` text NOT NULL,
	`type` text NOT NULL,
	`original_amount` real NOT NULL,
	`current_balance` real NOT NULL,
	`currency` text NOT NULL,
	`interest_rate` real,
	`monthly_payment` real,
	`total_installments` integer,
	`paid_installments` integer,
	`next_payment_date` text,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`name` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` real NOT NULL,
	`total_price` real NOT NULL,
	`sub_category` text
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`transaction_id` integer NOT NULL,
	`date` text NOT NULL,
	`merchant` text NOT NULL,
	`total` real NOT NULL,
	`currency` text NOT NULL,
	`trm` real NOT NULL,
	`item_count` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text NOT NULL,
	`user_id` text NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `tithe_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`amount_usd` real NOT NULL,
	`paid_to` text NOT NULL,
	`type` text NOT NULL,
	`notes` text,
	`transaction_id` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`concept` text NOT NULL,
	`category_id` integer NOT NULL,
	`amount` real NOT NULL,
	`currency` text NOT NULL,
	`trm` real NOT NULL,
	`amount_in_base` real NOT NULL,
	`amount_in_secondary` real NOT NULL,
	`invoice_id` integer,
	`debt_id` integer,
	`is_tithe_calculated` integer DEFAULT false,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
