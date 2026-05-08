-- Migration to enable ON DELETE CASCADE for all hostel-related tables
-- Using anonymous blocks to safely handle tables that might not exist

DO $$
BEGIN
    -- 0. Hostels Table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hostels') THEN
        ALTER TABLE hostels DROP CONSTRAINT IF EXISTS fk_hostel_owner;
        ALTER TABLE hostels ADD CONSTRAINT fk_hostel_owner FOREIGN KEY (owner_id) REFERENCES owners(owner_id) ON DELETE CASCADE;
    END IF;

    -- 1. Students Table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') THEN
        ALTER TABLE students DROP CONSTRAINT IF EXISTS students_hostel_id_fkey;
        ALTER TABLE students ADD CONSTRAINT students_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES hostels(hostel_id) ON DELETE CASCADE;
    END IF;

    -- 2. Rooms Table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rooms') THEN
        ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_hostel_id_fkey;
        ALTER TABLE rooms ADD CONSTRAINT rooms_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES hostels(hostel_id) ON DELETE CASCADE;
    END IF;

    -- 3. Fees Table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fees') THEN
        ALTER TABLE fees DROP CONSTRAINT IF EXISTS fees_hostel_id_fkey;
        ALTER TABLE fees ADD CONSTRAINT fees_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES hostels(hostel_id) ON DELETE CASCADE;
        
        ALTER TABLE fees DROP CONSTRAINT IF EXISTS fees_student_id_fkey;
        ALTER TABLE fees ADD CONSTRAINT fees_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
    END IF;

    -- 4. Fee Ledger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_ledger') THEN
        ALTER TABLE fee_ledger DROP CONSTRAINT IF EXISTS fee_ledger_hostel_id_fkey;
        ALTER TABLE fee_ledger ADD CONSTRAINT fee_ledger_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES hostels(hostel_id) ON DELETE CASCADE;
        
        ALTER TABLE fee_ledger DROP CONSTRAINT IF EXISTS fee_ledger_student_id_fkey;
        ALTER TABLE fee_ledger ADD CONSTRAINT fee_ledger_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
    END IF;

    -- 5. Security Deposits
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_deposits') THEN
        ALTER TABLE security_deposits DROP CONSTRAINT IF EXISTS security_deposits_hostel_id_fkey;
        ALTER TABLE security_deposits ADD CONSTRAINT security_deposits_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES hostels(hostel_id) ON DELETE CASCADE;
        
        ALTER TABLE security_deposits DROP CONSTRAINT IF EXISTS security_deposits_student_id_fkey;
        ALTER TABLE security_deposits ADD CONSTRAINT security_deposits_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
    END IF;

    -- 6. Payments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_fee_id_fkey;
        ALTER TABLE payments ADD CONSTRAINT payments_fee_id_fkey FOREIGN KEY (fee_id) REFERENCES fees(fee_id) ON DELETE CASCADE;
    END IF;

    -- 7. Payment Corrections
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_corrections') THEN
        ALTER TABLE payment_corrections DROP CONSTRAINT IF EXISTS payment_corrections_original_payment_id_fkey;
        ALTER TABLE payment_corrections ADD CONSTRAINT payment_corrections_original_payment_id_fkey FOREIGN KEY (original_payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE;
    END IF;

    -- 8. Complaints
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'complaints') THEN
        ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_hostel_id_fkey;
        ALTER TABLE complaints ADD CONSTRAINT complaints_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES hostels(hostel_id) ON DELETE CASCADE;
        
        ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_student_id_fkey;
        ALTER TABLE complaints ADD CONSTRAINT complaints_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
    END IF;

    -- 9. Expenses
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_hostel_id_fkey;
        ALTER TABLE expenses ADD CONSTRAINT expenses_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES hostels(hostel_id) ON DELETE CASCADE;
    END IF;

    -- 10. Analytics & Stats
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_financial_summary') THEN
        ALTER TABLE daily_financial_summary DROP CONSTRAINT IF EXISTS daily_financial_summary_hostel_id_fkey;
        ALTER TABLE daily_financial_summary ADD CONSTRAINT daily_financial_summary_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES hostels(hostel_id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monthly_analytics') THEN
        ALTER TABLE monthly_analytics DROP CONSTRAINT IF EXISTS monthly_analytics_hostel_id_fkey;
        ALTER TABLE monthly_analytics ADD CONSTRAINT monthly_analytics_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES hostels(hostel_id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'occupancy_analytics') THEN
        ALTER TABLE occupancy_analytics DROP CONSTRAINT IF EXISTS occupancy_analytics_hostel_id_fkey;
        ALTER TABLE occupancy_analytics ADD CONSTRAINT occupancy_analytics_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES hostels(hostel_id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_collection_stats') THEN
        ALTER TABLE fee_collection_stats DROP CONSTRAINT IF EXISTS fee_collection_stats_hostel_id_fkey;
        ALTER TABLE fee_collection_stats ADD CONSTRAINT fee_collection_stats_hostel_id_fkey FOREIGN KEY (hostel_id) REFERENCES hostels(hostel_id) ON DELETE CASCADE;
    END IF;
END $$;

