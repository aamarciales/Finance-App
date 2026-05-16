CREATE TABLE `commitment_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`commitment_id` integer NOT NULL,
	`payment_id` integer NOT NULL,
	`amount_usd` real NOT NULL,
	`created_at` text NOT NULL
);

-- Migrate existing tithe_payment_id links into junction table
INSERT INTO commitment_payments (commitment_id, payment_id, amount_usd, created_at)
SELECT id, tithe_payment_id, total_amount, created_at
FROM tithe_commitments
WHERE tithe_payment_id IS NOT NULL;

-- Reset partially-paid commitments back to 'pending' (status will be calculated dynamically)
-- Only mark as 'paid' if a single payment covers the full totalAmount
-- (The backend will recalculate properly based on commitment_payments sum)
