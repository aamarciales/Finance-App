ALTER TABLE transactions ADD COLUMN is_recurring INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN capital_amount REAL;
ALTER TABLE transactions ADD COLUMN interest_amount REAL;
ALTER TABLE debts ADD COLUMN is_paid INTEGER DEFAULT 0;
