-- ================================================================
-- BACKWARD-COMPATIBLE ROW LEVEL SECURITY (RLS) POLICIES
-- THESE ARE OPTIONAL - APPLY ONLY WHEN READY, NO BREAKING CHANGES
-- ================================================================

-- IMPORTANT:
-- 1. RLS is DISABLED by default - these policies won't affect anything until you enable RLS on tables
-- 2. Keep existing API authentication/authorization in place as primary security
-- 3. Apply RLS policies gradually, test thoroughly on staging first
-- 4. Can be rolled back easily by disabling RLS on tables

-- ================================================================
-- PRE-REQUISITE: ENABLE RLS ON TABLES (OPTIONAL)
-- ================================================================
-- Uncomment these lines ONLY when you're ready to enforce RLS
-- ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance_submissions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- RLS POLICIES BY ROLE
-- ================================================================

-- ================================================================
-- POLICIES FOR ADMIN ROLE (FULL ACCESS)
-- ================================================================
-- Admin can do everything to all tables
-- Note: Supabase admin user bypasses RLS by default, so these are optional

-- ================================================================
-- POLICIES FOR WARDEN ROLE
-- ================================================================

-- WARDEN: Can view ONLY their assigned hostel's students
-- DROP POLICY IF EXISTS warden_view_students ON students;
-- CREATE POLICY warden_view_students ON students
--     FOR SELECT
--     USING (
--         hostel_id IN (
--             SELECT hostel_id 
--             FROM hostels 
--             WHERE warden_id = current_setting('app.current_warden_id')::INT
--         )
--     );

-- WARDEN: Can edit ONLY their assigned hostel's students
-- DROP POLICY IF EXISTS warden_edit_students ON students;
-- CREATE POLICY warden_edit_students ON students
--     FOR ALL
--     USING (
--         hostel_id IN (
--             SELECT hostel_id 
--             FROM hostels 
--             WHERE warden_id = current_setting('app.current_warden_id')::INT
--         )
--     )
--     WITH CHECK (
--         hostel_id IN (
--             SELECT hostel_id 
--             FROM hostels 
--             WHERE warden_id = current_setting('app.current_warden_id')::INT
--         )
--     );

-- ================================================================
-- POLICIES FOR STUDENT ROLE (IF IMPLEMENTED)
-- ================================================================

-- STUDENT: Can view ONLY their own data
-- DROP POLICY IF EXISTS student_view_own_data ON students;
-- CREATE POLICY student_view_own_data ON students
--     FOR SELECT
--     USING (student_id = current_setting('app.current_student_id')::INT);

-- STUDENT: Can view ONLY their own fees
-- DROP POLICY IF EXISTS student_view_own_fees ON fees;
-- CREATE POLICY student_view_own_fees ON fees
--     FOR SELECT
--     USING (student_id = current_setting('app.current_student_id')::INT);

-- ================================================================
-- IMPORTANT IMPLEMENTATION NOTES:
-- ================================================================
-- 1. To use these policies, your backend must set the appropriate session variables:
--    SET app.current_warden_id = '123';
--    SET app.current_student_id = '456';
-- 2. Keep your existing JWT-based authentication as the primary security
-- 3. RLS should be a secondary layer of defense
-- 4. Test extensively on staging before applying to production!
-- 5. To rollback, simply run: ALTER TABLE [table_name] DISABLE ROW LEVEL SECURITY;
