CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`target_amount` real NOT NULL,
	`current_amount` real DEFAULT 0 NOT NULL,
	`deadline` text,
	`currency` text NOT NULL,
	`color` text NOT NULL,
	`icon` text NOT NULL,
	`created_at` text NOT NULL
);
