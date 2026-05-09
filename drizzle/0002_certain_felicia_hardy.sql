ALTER TABLE `invoice_items` ADD `barcode` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `invoice_number` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `payment_method` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `location` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `attachment_url` text;