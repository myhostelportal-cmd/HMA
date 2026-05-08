-- ================================================================
-- PHASE 1: SAFE PRODUCTION-GRADE INDEX IMPLEMENTATION
-- 100% BACKWARD-COMPATIBLE, NO BREAKING CHANGES, FULLY REVERSIBLE
-- ================================================================

-- ================================================================
-- PRE-CHECK: EXISTING INDEXES ANALYSIS
-- ================================================================
-- First, let's list all existing indexes to avoid duplicates
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ================================================================
-- INDEX CREATION (ALL SAFE, IF NOT EXISTS)
-- ================================================================

-- ------------------------------
-- 1. student_attendance TABLE INDEXES
-- ------------------------------
-- Reason: Eliminate SEQ SCAN for student_id lookups
-- Expected improvement: Queries by student_id go from O(n) to O(log n)
-- Impact on writes: Minimal (tiny overhead on INSERT/UPDATE, worth it for read gains)
CREATE INDEX IF NOT EXISTS idx_attendance_student_date 
ON student_attendance (student_id, date);

-- Reason: Fast daily attendance queries (e.g., "get all attendance for today")
-- Expected improvement: Fast date-range filtering
CREATE INDEX IF NOT EXISTS idx_attendance_date 
ON student_attendance (date);

-- Reason: Fast status filtering (e.g., "get all absent students today")
CREATE INDEX IF NOT EXISTS idx_attendance_status 
ON student_attendance (status);

-- ------------------------------
-- 2. attendance_submissions TABLE INDEXES
-- ------------------------------
-- Reason: Fast lookups by hostel + date (primary usage pattern)
CREATE INDEX IF NOT EXISTS idx_submission_hostel_date 
ON attendance_submissions (hostel_id, date);

-- Reason: Fast date filtering for submissions
CREATE INDEX IF NOT EXISTS idx_submission_date 
ON attendance_submissions (date);

-- Reason: Fast lookup by submitter
CREATE INDEX IF NOT EXISTS idx_submission_submitted_by 
ON attendance_submissions (submitted_by, submitted_by_role);

-- ------------------------------
-- 3. students TABLE INDEXES
-- ------------------------------
-- Reason: Fast filtering by hostel (extremely common query)
CREATE INDEX IF NOT EXISTS idx_students_hostel 
ON students (hostel_id);

-- Reason: Fast filtering by room
CREATE INDEX IF NOT EXISTS idx_students_room 
ON students (room_id);

-- Reason: Fast filtering by student status (active/inactive)
CREATE INDEX IF NOT EXISTS idx_students_status 
ON students (status);

-- Reason: Fast student name search (prefix search)
CREATE INDEX IF NOT EXISTS idx_students_name 
ON students (name);

-- ------------------------------
-- 4. hostels TABLE INDEXES
-- ------------------------------
-- Reason: Fast lookups by owner
CREATE INDEX IF NOT EXISTS idx_hostels_owner 
ON hostels (owner_id);

-- Reason: Fast lookups by warden
CREATE INDEX IF NOT EXISTS idx_hostels_warden 
ON hostels (warden_id);

-- ------------------------------
-- 5. rooms TABLE INDEXES
-- ------------------------------
-- Reason: Fast filtering by hostel
CREATE INDEX IF NOT EXISTS idx_rooms_hostel 
ON rooms (hostel_id);

-- Reason: Fast filtering by room status (available/full/maintenance)
CREATE INDEX IF NOT EXISTS idx_rooms_status 
ON rooms (status);

-- ------------------------------
-- 6. fees TABLE INDEXES
-- ------------------------------
-- Reason: Fast student fee history lookups
CREATE INDEX IF NOT EXISTS idx_fees_student 
ON fees (student_id);

-- Reason: Fast hostel fee lookups
CREATE INDEX IF NOT EXISTS idx_fees_hostel 
ON fees (hostel_id);

-- Reason: Fast fee status filtering
CREATE INDEX IF NOT EXISTS idx_fees_status 
ON fees (status);

-- Reason: Fast due-date sorting/filtering (critical for reminders/dashboard)
CREATE INDEX IF NOT EXISTS idx_fees_due_date 
ON fees (due_date DESC);

-- Reason: Fast combined hostel + due date queries
CREATE INDEX IF NOT EXISTS idx_fees_hostel_due 
ON fees (hostel_id, due_date DESC);

-- ------------------------------
-- 7. payments TABLE INDEXES
-- ------------------------------
-- Reason: Fast student payment history
CREATE INDEX IF NOT EXISTS idx_payments_student 
ON payments (student_id);

-- Reason: Fast hostel payment history
CREATE INDEX IF NOT EXISTS idx_payments_hostel 
ON payments (hostel_id);

-- Reason: Fast payment date sorting/filtering
CREATE INDEX IF NOT EXISTS idx_payments_date 
ON payments (actual_payment_date DESC);

-- Reason: Fast combined hostel + payment date queries
CREATE INDEX IF NOT EXISTS idx_payments_hostel_date 
ON payments (hostel_id, actual_payment_date DESC);

-- ------------------------------
-- 8. fee_ledger TABLE INDEXES
-- ------------------------------
-- Reason: Fast student ledger lookups
CREATE INDEX IF NOT EXISTS idx_ledger_student 
ON fee_ledger (student_id);

-- Reason: Fast hostel ledger lookups
CREATE INDEX IF NOT EXISTS idx_ledger_hostel 
ON fee_ledger (hostel_id);

-- Reason: Fast ledger date sorting
CREATE INDEX IF NOT EXISTS idx_ledger_date 
ON fee_ledger (created_at DESC);

-- ------------------------------
-- 9. complaints TABLE INDEXES
-- ------------------------------
-- Reason: Fast student complaint lookups
CREATE INDEX IF NOT EXISTS idx_complaints_student 
ON complaints (student_id);

-- Reason: Fast hostel complaint lookups
CREATE INDEX IF NOT EXISTS idx_complaints_hostel 
ON complaints (hostel_id);

-- Reason: Fast complaint status filtering
CREATE INDEX IF NOT EXISTS idx_complaints_status 
ON complaints (status);

-- Reason: Fast complaint date sorting
CREATE INDEX IF NOT EXISTS idx_complaints_date 
ON complaints (created_at DESC);

-- ------------------------------
-- 10. activity_logs TABLE INDEXES
-- ------------------------------
-- Reason: Fast log sorting by timestamp (most common usage)
CREATE INDEX IF NOT EXISTS idx_logs_timestamp 
ON activity_logs (timestamp DESC);

-- Reason: Fast user-specific log lookups
CREATE INDEX IF NOT EXISTS idx_logs_user_role 
ON activity_logs (user_id, user_role, timestamp DESC);

-- Reason: Fast module-specific log lookups
CREATE INDEX IF NOT EXISTS idx_logs_module 
ON activity_logs (module, timestamp DESC);

-- ------------------------------
-- OPTIONAL: ADDITIONAL TABLE INDEXES (IF THEY EXIST)
-- ------------------------------
DO $$
BEGIN
    -- receipt_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'receipt_logs') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_receipts_student ON receipt_logs (student_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_receipts_hostel ON receipt_logs (hostel_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipt_logs (created_at DESC)';
    END IF;

    -- student_exit_records
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_exit_records') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_exit_student ON student_exit_records (student_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_exit_date ON student_exit_records (exit_date DESC)';
    END IF;

    -- security_deposits
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_deposits') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_deposit_student ON security_deposits (student_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_deposit_hostel ON security_deposits (hostel_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_deposit_status ON security_deposits (status)';
    END IF;
END $$;

-- ================================================================
-- VERIFICATION: LIST ALL INDEXES AFTER CREATION
-- ================================================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ================================================================
-- VERIFICATION: EXPLAIN ANALYZE TEST QUERY
-- ================================================================
-- Test the most common query - it should now use INDEX SCAN instead of SEQ SCAN
-- (Note: If table is still small, PostgreSQL might still choose SEQ SCAN - this is normal!)
EXPLAIN ANALYZE 
SELECT * 
FROM student_attendance 
WHERE student_id = 10;

-- ================================================================
-- ROLLBACK: DROP ALL INDEXES CREATED HERE (IF NEEDED)
-- ================================================================
-- Uncomment and run only if you need to rollback!
/*
DROP INDEX IF EXISTS idx_attendance_student_date;
DROP INDEX IF EXISTS idx_attendance_date;
DROP INDEX IF EXISTS idx_attendance_status;
DROP INDEX IF EXISTS idx_submission_hostel_date;
DROP INDEX IF EXISTS idx_submission_date;
DROP INDEX IF EXISTS idx_submission_submitted_by;
DROP INDEX IF EXISTS idx_students_hostel;
DROP INDEX IF EXISTS idx_students_room;
DROP INDEX IF EXISTS idx_students_status;
DROP INDEX IF EXISTS idx_students_name;
DROP INDEX IF EXISTS idx_hostels_owner;
DROP INDEX IF EXISTS idx_hostels_warden;
DROP INDEX IF EXISTS idx_rooms_hostel;
DROP INDEX IF EXISTS idx_rooms_status;
DROP INDEX IF EXISTS idx_fees_student;
DROP INDEX IF EXISTS idx_fees_hostel;
DROP INDEX IF EXISTS idx_fees_status;
DROP INDEX IF EXISTS idx_fees_due_date;
DROP INDEX IF EXISTS idx_fees_hostel_due;
DROP INDEX IF EXISTS idx_payments_student;
DROP INDEX IF EXISTS idx_payments_hostel;
DROP INDEX IF EXISTS idx_payments_date;
DROP INDEX IF EXISTS idx_payments_hostel_date;
DROP INDEX IF EXISTS idx_ledger_student;
DROP INDEX IF EXISTS idx_ledger_hostel;
DROP INDEX IF EXISTS idx_ledger_date;
DROP INDEX IF EXISTS idx_complaints_student;
DROP INDEX IF EXISTS idx_complaints_hostel;
DROP INDEX IF EXISTS idx_complaints_status;
DROP INDEX IF EXISTS idx_complaints_date;
DROP INDEX IF EXISTS idx_logs_timestamp;
DROP INDEX IF EXISTS idx_logs_user_role;
DROP INDEX IF EXISTS idx_logs_module;

-- Optional indexes rollback
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_receipts_student') THEN
        EXECUTE 'DROP INDEX IF EXISTS idx_receipts_student';
        EXECUTE 'DROP INDEX IF EXISTS idx_receipts_hostel';
        EXECUTE 'DROP INDEX IF EXISTS idx_receipts_date';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_exit_student') THEN
        EXECUTE 'DROP INDEX IF EXISTS idx_exit_student';
        EXECUTE 'DROP INDEX IF EXISTS idx_exit_date';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_deposit_student') THEN
        EXECUTE 'DROP INDEX IF EXISTS idx_deposit_student';
        EXECUTE 'DROP INDEX IF EXISTS idx_deposit_hostel';
        EXECUTE 'DROP INDEX IF EXISTS idx_deposit_status';
    END IF;
END $$;
*/

-- ================================================================
-- INDEX CREATION COMPLETE!
-- ================================================================
RAISE NOTICE 'All safe indexes created successfully!';
RAISE NOTICE 'No breaking changes, fully reversible with the included rollback queries.';
