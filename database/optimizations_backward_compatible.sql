-- ================================================================
-- BACKWARD-COMPATIBLE PRODUCTION OPTIMIZATIONS
-- NO BREAKING CHANGES, NO DATA LOSS, FULLY COMPATIBLE WITH EXISTING SYSTEM
-- ================================================================

-- ================================================================
-- PART 1: SAFE UNIQUE CONSTRAINTS (WITH DUPLICATE CHECK FIRST)
-- ================================================================

-- Check for existing duplicate student_attendance records first
-- If duplicates exist, we need to handle them before adding constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_student_attendance_date') THEN
        -- Check for duplicates
        IF EXISTS (
            SELECT student_id, date 
            FROM student_attendance 
            GROUP BY student_id, date 
            HAVING COUNT(*) > 1
        ) THEN
            RAISE NOTICE 'Found duplicate student_attendance records! Please clean them first.';
        ELSE
            -- No duplicates, safe to add constraint
            ALTER TABLE student_attendance 
            ADD CONSTRAINT unique_student_attendance_date 
            UNIQUE (student_id, date);
            RAISE NOTICE 'Added unique_student_attendance_date constraint successfully!';
        END IF;
    ELSE
        RAISE NOTICE 'unique_student_attendance_date constraint already exists.';
    END IF;
END $$;

-- Check for existing duplicate attendance_submissions records first
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_attendance_submission_hostel_date') THEN
        -- Check for duplicates
        IF EXISTS (
            SELECT hostel_id, date 
            FROM attendance_submissions 
            GROUP BY hostel_id, date 
            HAVING COUNT(*) > 1
        ) THEN
            RAISE NOTICE 'Found duplicate attendance_submissions records! Please clean them first.';
        ELSE
            -- No duplicates, safe to add constraint
            ALTER TABLE attendance_submissions 
            ADD CONSTRAINT unique_attendance_submission_hostel_date 
            UNIQUE (hostel_id, date);
            RAISE NOTICE 'Added unique_attendance_submission_hostel_date constraint successfully!';
        END IF;
    ELSE
        RAISE NOTICE 'unique_attendance_submission_hostel_date constraint already exists.';
    END IF;
END $$;

-- ================================================================
-- PART 2: PRODUCTION-GRADE INDEXES (BACKWARD-COMPATIBLE)
-- ================================================================

-- ------------------------------
-- student_attendance indexes
-- ------------------------------
CREATE INDEX IF NOT EXISTS idx_attendance_student_date 
ON student_attendance (student_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_date 
ON student_attendance (date);

CREATE INDEX IF NOT EXISTS idx_attendance_status 
ON student_attendance (status);

-- ------------------------------
-- attendance_submissions indexes
-- ------------------------------
CREATE INDEX IF NOT EXISTS idx_submission_hostel_date 
ON attendance_submissions (hostel_id, date);

CREATE INDEX IF NOT EXISTS idx_submission_date 
ON attendance_submissions (date);

CREATE INDEX IF NOT EXISTS idx_submission_submitted_by 
ON attendance_submissions (submitted_by, submitted_by_role);

-- ------------------------------
-- students indexes
-- ------------------------------
CREATE INDEX IF NOT EXISTS idx_students_hostel 
ON students (hostel_id);

CREATE INDEX IF NOT EXISTS idx_students_room 
ON students (room_id);

CREATE INDEX IF NOT EXISTS idx_students_status 
ON students (status);

CREATE INDEX IF NOT EXISTS idx_students_name 
ON students (name);

-- ------------------------------
-- hostels indexes
-- ------------------------------
CREATE INDEX IF NOT EXISTS idx_hostels_owner 
ON hostels (owner_id);

CREATE INDEX IF NOT EXISTS idx_hostels_warden 
ON hostels (warden_id);

-- ------------------------------
-- rooms indexes
-- ------------------------------
CREATE INDEX IF NOT EXISTS idx_rooms_hostel 
ON rooms (hostel_id);

CREATE INDEX IF NOT EXISTS idx_rooms_status 
ON rooms (status);

-- ------------------------------
-- fees indexes
-- ------------------------------
CREATE INDEX IF NOT EXISTS idx_fees_student 
ON fees (student_id);

CREATE INDEX IF NOT EXISTS idx_fees_hostel 
ON fees (hostel_id);

CREATE INDEX IF NOT EXISTS idx_fees_status 
ON fees (status);

CREATE INDEX IF NOT EXISTS idx_fees_due_date 
ON fees (due_date DESC);

CREATE INDEX IF NOT EXISTS idx_fees_hostel_due 
ON fees (hostel_id, due_date DESC);

-- ------------------------------
-- payments indexes
-- ------------------------------
CREATE INDEX IF NOT EXISTS idx_payments_student 
ON payments (student_id);

CREATE INDEX IF NOT EXISTS idx_payments_hostel 
ON payments (hostel_id);

CREATE INDEX IF NOT EXISTS idx_payments_date 
ON payments (actual_payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_hostel_date 
ON payments (hostel_id, actual_payment_date DESC);

-- ------------------------------
-- fee_ledger indexes
-- ------------------------------
CREATE INDEX IF NOT EXISTS idx_ledger_student 
ON fee_ledger (student_id);

CREATE INDEX IF NOT EXISTS idx_ledger_hostel 
ON fee_ledger (hostel_id);

CREATE INDEX IF NOT EXISTS idx_ledger_date 
ON fee_ledger (created_at DESC);

-- ------------------------------
-- complaints indexes
-- ------------------------------
CREATE INDEX IF NOT EXISTS idx_complaints_student 
ON complaints (student_id);

CREATE INDEX IF NOT EXISTS idx_complaints_hostel 
ON complaints (hostel_id);

CREATE INDEX IF NOT EXISTS idx_complaints_status 
ON complaints (status);

CREATE INDEX IF NOT EXISTS idx_complaints_date 
ON complaints (created_at DESC);

-- ------------------------------
-- activity_logs indexes
-- ------------------------------
CREATE INDEX IF NOT EXISTS idx_logs_timestamp 
ON activity_logs (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_logs_user_role 
ON activity_logs (user_id, user_role, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_logs_module 
ON activity_logs (module, timestamp DESC);

-- ------------------------------
-- receipt_logs (if exists)
-- ------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'receipt_logs') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_receipts_student ON receipt_logs (student_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_receipts_hostel ON receipt_logs (hostel_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipt_logs (created_at DESC)';
    END IF;
END $$;

-- ------------------------------
-- student_exit_records indexes
-- ------------------------------
CREATE INDEX IF NOT EXISTS idx_exit_student 
ON student_exit_records (student_id);

CREATE INDEX IF NOT EXISTS idx_exit_date 
ON student_exit_records (exit_date DESC);

-- ------------------------------
-- security_deposits indexes
-- ------------------------------
CREATE INDEX IF NOT EXISTS idx_deposit_student 
ON security_deposits (student_id);

CREATE INDEX IF NOT EXISTS idx_deposit_hostel 
ON security_deposits (hostel_id);

CREATE INDEX IF NOT EXISTS idx_deposit_status 
ON security_deposits (status);

-- ================================================================
-- PART 3: ACTIVITY LOGS BACKWARD-COMPATIBLE UPGRADE
-- ================================================================

-- Add action_type and metadata columns (optional, backward-compatible)
-- Old logs continue to work with the existing "action" column
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS action_type VARCHAR(100);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create index on new columns if needed
CREATE INDEX IF NOT EXISTS idx_logs_action_type 
ON activity_logs (action_type, timestamp DESC);

-- ================================================================
-- OPTIMIZATION COMPLETE!
-- ================================================================

RAISE NOTICE 'All backward-compatible optimizations applied successfully!';
RAISE NOTICE 'No breaking changes, no data loss, fully compatible with existing system.';
