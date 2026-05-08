-- Hostel Management System - Fees Module Extension (Corrected)

-- 1. Update Students Table to include Redesigned Fee Model
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_model VARCHAR(50) DEFAULT '2 + 1 System';
ALTER TABLE students ADD COLUMN IF NOT EXISTS total_session_fees DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE students ADD COLUMN IF NOT EXISTS total_months_stay INT DEFAULT 10;
ALTER TABLE students ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE students ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE students ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE;

-- 2. Update Fees Table for Installments and 2+1 System
ALTER TABLE fees ADD COLUMN IF NOT EXISTS fee_type VARCHAR(50) DEFAULT 'monthly'; -- monthly, installment, remaining, advance_payment
ALTER TABLE fees ADD COLUMN IF NOT EXISTS advance_status VARCHAR(20); -- unadjusted, adjusted
ALTER TABLE fees ADD COLUMN IF NOT EXISTS advance_balance DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS payment_source VARCHAR(20) DEFAULT 'DIRECT'; -- DIRECT, ADVANCE_ADJUSTED
ALTER TABLE fees ADD COLUMN IF NOT EXISTS adjusted_from_advance BOOLEAN DEFAULT FALSE;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS installment_name VARCHAR(50); -- First, Second, Third, Remaining
ALTER TABLE fees ADD COLUMN IF NOT EXISTS month_type VARCHAR(20); -- Running, Advance
ALTER TABLE fees ADD COLUMN IF NOT EXISTS adjustment_amount DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE fees ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(120);
ALTER TABLE fees ADD COLUMN IF NOT EXISTS receipt_id VARCHAR(50);

-- 2. Create Ledger Table for detailed audit tracking
CREATE TABLE IF NOT EXISTS fee_ledger (
    ledger_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id),
    hostel_id INT REFERENCES hostels(hostel_id),
    transaction_type VARCHAR(50) NOT NULL, -- Payment, Correction, Refund, Deposit
    amount DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    reference_id INT, -- payment_id, correction_id, etc.
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Update Fees Table for Period-based tracking
ALTER TABLE fees ADD COLUMN IF NOT EXISTS month VARCHAR(20);
ALTER TABLE fees ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS grace_period_end DATE;

-- 4. Create Payments Table if it doesn't exist (it was missing in debug)
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    fee_id INT REFERENCES fees(fee_id),
    payment_method VARCHAR(50) NOT NULL, -- cash, online, bank
    transaction_id VARCHAR(120) UNIQUE,
    reverify_transaction_id VARCHAR(120),
    payment_type VARCHAR(50), -- Running, Advance, Installment
    amount DECIMAL(10, 2) NOT NULL,
    period_start DATE,
    period_end DATE,
    remarks TEXT,
    receipt_id VARCHAR(50) UNIQUE,
    status VARCHAR(20) DEFAULT 'completed', -- completed, corrected
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Corrections Table
CREATE TABLE IF NOT EXISTS payment_corrections (
    correction_id SERIAL PRIMARY KEY,
    original_payment_id INT REFERENCES payments(payment_id),
    corrected_by_warden INT REFERENCES wardens(warden_id),
    reason TEXT NOT NULL,
    old_amount DECIMAL(10, 2),
    new_amount DECIMAL(10, 2),
    correction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create Security Deposit Tracking
CREATE TABLE IF NOT EXISTS security_deposits (
    deposit_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id),
    hostel_id INT REFERENCES hostels(hostel_id),
    total_deposit DECIMAL(10, 2) NOT NULL,
    damages_deducted DECIMAL(10, 2) DEFAULT 0.00,
    pending_fees_deducted DECIMAL(10, 2) DEFAULT 0.00,
    refund_amount DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'active', -- active, refunded, partially_refunded
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    refunded_at TIMESTAMP
);
