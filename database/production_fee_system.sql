-- Production Grade Fee Management System Schema

-- 1. Drop old tables if necessary or add missing columns to ensure the "Scratch" development
-- To avoid breaking other things, we will ensure columns exist.

-- Update Fees Table
ALTER TABLE fees ADD COLUMN IF NOT EXISTS fee_type VARCHAR(50) DEFAULT 'monthly'; -- monthly, installment, one-time, remaining
ALTER TABLE fees ADD COLUMN IF NOT EXISTS installment_name VARCHAR(50);
ALTER TABLE fees ADD COLUMN IF NOT EXISTS month_type VARCHAR(20); -- Running, Advance
ALTER TABLE fees ADD COLUMN IF NOT EXISTS adjustment_amount DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE fees ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(120);
ALTER TABLE fees ADD COLUMN IF NOT EXISTS receipt_id VARCHAR(120);
ALTER TABLE fees ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'unpaid'; -- paid, unpaid, pending, partial

-- Add unique constraint for transaction_id to prevent duplicate entries
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_transaction_id') THEN
        ALTER TABLE fees ADD CONSTRAINT unique_transaction_id UNIQUE (transaction_id);
    END IF;
END $$;

-- Recreate Payments Table for Detailed Audit
DROP TABLE IF EXISTS payments CASCADE;
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    fee_id INT REFERENCES fees(fee_id) ON DELETE CASCADE,
    student_id INT REFERENCES students(student_id) ON DELETE CASCADE,
    hostel_id INT REFERENCES hostels(hostel_id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- Cash, UPI, Bank Transfer
    transaction_id VARCHAR(120) UNIQUE,
    receipt_id VARCHAR(120) UNIQUE,
    actual_payment_date DATE DEFAULT CURRENT_DATE,
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'completed', -- completed, reversed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recreate Fee Ledger for Permanent Accounting
DROP TABLE IF EXISTS fee_ledger CASCADE;
CREATE TABLE fee_ledger (
    ledger_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id) ON DELETE CASCADE,
    hostel_id INT REFERENCES hostels(hostel_id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- Payment, Carry-Forward, Adjustment
    amount DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    reference_id INT, -- payment_id
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
