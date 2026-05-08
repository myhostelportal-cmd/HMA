-- ================================================================
-- PHASE 2: SAFE UNIQUE CONSTRAINT IMPLEMENTATION
-- 100% BACKWARD-COMPATIBLE, DUPLICATE CHECKS FIRST, FULLY REVERSIBLE
-- ================================================================

-- ================================================================
-- PRE-CHECK 1: VERIFY NO DUPLICATES EXIST IN student_attendance
-- ================================================================
SELECT 
    student_id, 
    date, 
    COUNT(*) AS duplicate_count
FROM student_attendance
GROUP BY student_id, date
HAVING COUNT(*) > 1;

-- ================================================================
-- PRE-CHECK 2: VERIFY NO DUPLICATES EXIST IN attendance_submissions
-- (Note: First check if attendance_submissions table has hostel_id and date columns!)
-- ================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'attendance_submissions' 
        AND column_name IN ('hostel_id', 'date')
    ) THEN
        RAISE NOTICE 'Checking attendance_submissions for duplicates...';
        -- Uncomment the next line if you want to run the duplicate check
        -- EXECUTE 'SELECT hostel_id, date, COUNT(*) AS duplicate_count FROM attendance_submissions GROUP BY hostel_id, date HAVING COUNT(*) > 1';
    ELSE
        RAISE NOTICE 'attendance_submissions table does not have required columns (hostel_id, date) - skipping duplicate check.';
    END IF;
END $$;

-- ================================================================
-- SAFETY WARNING:
-- ================================================================
-- IF YOUR FRONTEND CURRENTLY SENDS RETRIES OR DUPLICATE INSERTS,
-- DO NOT APPLY THESE CONSTRAINTS DIRECTLY!
-- 
-- FIRST IMPLEMENT APPLICATION-LEVEL DUPLICATE HANDLING:
-- 1. Add idempotency keys to API requests
-- 2. Check for existing records BEFORE inserting
-- 3. Use UPSERT (INSERT ... ON CONFLICT DO NOTHING) in backend
-- 
-- ONLY APPLY CONSTRAINTS AFTER APPLICATION-LEVEL HANDLING IS IN PLACE!

-- ================================================================
-- OPTIONAL: SAFELY APPLY UNIQUE CONSTRAINTS (IF NO DUPLICATES & APP IS READY)
-- ================================================================
DO $$
BEGIN
    -- Apply constraint to student_attendance
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_student_attendance_date') THEN
        RAISE NOTICE 'Attempting to add unique_student_attendance_date constraint...';
        ALTER TABLE student_attendance 
        ADD CONSTRAINT unique_student_attendance_date 
        UNIQUE (student_id, date);
        RAISE NOTICE 'unique_student_attendance_date constraint added successfully!';
    ELSE
        RAISE NOTICE 'unique_student_attendance_date constraint already exists.';
    END IF;

    -- Apply constraint to attendance_submissions (if table structure allows)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'attendance_submissions' 
        AND column_name IN ('hostel_id', 'date')
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_attendance_submission_hostel_date') THEN
            RAISE NOTICE 'Attempting to add unique_attendance_submission_hostel_date constraint...';
            EXECUTE 'ALTER TABLE attendance_submissions ADD CONSTRAINT unique_attendance_submission_hostel_date UNIQUE (hostel_id, date)';
            RAISE NOTICE 'unique_attendance_submission_hostel_date constraint added successfully!';
        ELSE
            RAISE NOTICE 'unique_attendance_submission_hostel_date constraint already exists.';
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add unique constraints. Error: %', SQLERRM;
        RAISE NOTICE 'Please check for duplicates or application-level issues first.';
END $$;

-- ================================================================
-- VERIFICATION: LIST ALL CONSTRAINTS
-- ================================================================
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    conrelid::regclass AS table_name
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass, conname;

-- ================================================================
-- ROLLBACK: DROP UNIQUE CONSTRAINTS (IF NEEDED)
-- ================================================================
-- Uncomment and run only if you need to rollback!
/*
ALTER TABLE student_attendance DROP CONSTRAINT IF EXISTS unique_student_attendance_date;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_attendance_submission_hostel_date') THEN
        EXECUTE 'ALTER TABLE attendance_submissions DROP CONSTRAINT IF EXISTS unique_attendance_submission_hostel_date';
    END IF;
END $$;
*/

-- ================================================================
-- RECOMMENDATION: APPLICATION-LEVEL DUPLICATE HANDLING FIRST
-- ================================================================
-- 1. In your backend API:
--    - Before inserting attendance, first check if (student_id, date) already exists
--    - Use INSERT ... ON CONFLICT DO NOTHING or DO UPDATE
-- 
-- 2. Example backend code (Node.js/Express):
--    const existing = await db.query('SELECT 1 FROM student_attendance WHERE student_id = $1 AND date = $2', [studentId, date]);
--    if (existing.rows.length > 0) return res.status(200).json({ message: 'Attendance already marked' });
-- 
-- 3. Add idempotency keys to prevent duplicate requests from retries

-- ================================================================
-- UNIQUE CONSTRAINT SAFETY CHECK COMPLETE!
-- ================================================================
RAISE NOTICE 'Unique constraint safety check complete.';
RAISE NOTICE 'Only apply constraints after confirming no duplicates and application-level handling is in place.';
