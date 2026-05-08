-- ================================================================
-- PHASE 3–6: COMPLETE PRODUCTION SAFETY & VERIFICATION PACKAGE
-- ================================================================

-- ================================================================
-- PHASE 3: SAFE PERFORMANCE VERIFICATION
-- ================================================================

-- ------------------------------
-- 3.1: Verify index usage
-- ------------------------------
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ------------------------------
-- 3.2: Explain analyze common queries (student attendance)
-- ------------------------------
-- Note: If table is small (<10k rows), PostgreSQL may still choose SEQ SCAN - this is NORMAL!
-- Indexes will automatically be used as the dataset grows!
EXPLAIN ANALYZE 
SELECT * 
FROM student_attendance 
WHERE student_id = 10;

EXPLAIN ANALYZE 
SELECT * 
FROM student_attendance 
WHERE date = CURRENT_DATE;

-- ------------------------------
-- 3.3: Explain analyze common queries (payments)
-- ------------------------------
EXPLAIN ANALYZE 
SELECT * 
FROM payments 
WHERE student_id = 10
ORDER BY actual_payment_date DESC
LIMIT 10;

EXPLAIN ANALYZE 
SELECT * 
FROM payments 
WHERE hostel_id = 1
ORDER BY actual_payment_date DESC
LIMIT 50;

-- ------------------------------
-- 3.4: Why SEQ SCAN currently appears?
-- ------------------------------
-- Reasons you might still see SEQ SCAN:
-- 1. Table is very small (<1000 rows) - PostgreSQL decides SEQ SCAN is faster
-- 2. Statistics are outdated - run ANALYZE to refresh
-- 3. Query returns most of the table - SEQ SCAN is better in this case

-- Optional: Refresh statistics
ANALYZE student_attendance;
ANALYZE payments;
ANALYZE students;
ANALYZE fees;

-- ================================================================
-- PHASE 4: RLS SAFETY MODE (TESTING-ONLY, OPTIONAL)
-- ================================================================

-- ------------------------------
-- 4.1: Important RLS Safety Warnings
-- ------------------------------
-- DO NOT ENABLE RLS ON PRODUCTION WITHOUT EXTENSIVE STAGING TESTING FIRST!
-- RLS can break:
-- - Dashboard queries with joins
-- - Real-time subscriptions
-- - Admin/owner reports
-- - Any API endpoint that accesses multiple hostels' data
-- - Your existing authentication/authorization system is already the primary security!

-- ------------------------------
-- 4.2: SAFETY FIRST: RLS is DISABLED by default
-- ------------------------------
-- These policies are for TESTING ONLY on STAGING!
-- They won't affect anything until you run ALTER TABLE ... ENABLE ROW LEVEL SECURITY;

-- ------------------------------
-- 4.3: Staging-only test policies (DISABLED by default)
-- ------------------------------
-- Uncomment ONLY ON STAGING for testing!
/*
-- Test policy for students (warden can see only their hostel's students)
-- DROP POLICY IF EXISTS test_warden_view_students ON students;
-- CREATE POLICY test_warden_view_students ON students
--     FOR SELECT
--     USING (true); -- Temporarily allow all for testing, then restrict

-- Note: For proper RLS, your backend needs to set session variables like:
-- SET app.current_warden_id = '123';
*/

-- ================================================================
-- PHASE 5: ACTIVITY LOG SAFETY
-- ================================================================

-- ------------------------------
-- 5.1: Current activity_logs is already working - indexes are enough for now!
-- ------------------------------
-- The Phase 1 indexes (idx_logs_timestamp, idx_logs_user_role, idx_logs_module)
-- are sufficient for current and near-future usage.

-- ------------------------------
-- 5.2: Optional backward-compatible log enhancements (NO BREAKING CHANGES)
-- ------------------------------
-- Add optional columns - old logs continue to work exactly the same!
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS action_type VARCHAR(100);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Optional index for new columns
CREATE INDEX IF NOT EXISTS idx_logs_action_type 
ON activity_logs (action_type, timestamp DESC);

-- ------------------------------
-- 5.3: Log archiving strategy (for later)
-- ------------------------------
-- Step 1: Create archive table
-- CREATE TABLE activity_logs_archive (LIKE activity_logs INCLUDING ALL);

-- Step 2: Move old logs (e.g., older than 3 months)
-- INSERT INTO activity_logs_archive SELECT * FROM activity_logs WHERE timestamp < NOW() - INTERVAL '3 months';
-- DELETE FROM activity_logs WHERE timestamp < NOW() - INTERVAL '3 months';

-- ================================================================
-- PHASE 6: PRODUCTION SAFETY CHECKLIST
-- ================================================================

-- ------------------------------
-- 6.1: Backup recommendations
-- ------------------------------
-- 1. Take a FULL database backup before ANY changes
-- 2. Use Supabase Point-in-Time Recovery (PITR) if available
-- 3. Test backup restoration on staging first
-- 4. Keep backups in multiple secure locations

-- ------------------------------
-- 6.2: Rollback queries
-- ------------------------------
-- Phase 1 rollback: See phase_1_safe_indexes.sql (bottom of file)
-- Phase 2 rollback: See phase_2_unique_constraints_safety.sql (bottom of file)
-- Activity log enhancements rollback:
-- ALTER TABLE activity_logs DROP COLUMN IF EXISTS action_type;
-- ALTER TABLE activity_logs DROP COLUMN IF EXISTS metadata;
-- DROP INDEX IF EXISTS idx_logs_action_type;

-- ------------------------------
-- 6.3: Testing checklist (MUST COMPLETE BEFORE PRODUCTION)
-- ------------------------------
-- ✅ Test on staging environment first
-- ✅ Verify all existing APIs return correct responses
-- ✅ Verify frontend displays all data correctly
-- ✅ Verify attendance flow unchanged
-- ✅ Verify payment flow unchanged
-- ✅ Verify receipt generation unchanged
-- ✅ Verify dashboard analytics unchanged
-- ✅ Verify authentication/authorization unchanged
-- ✅ Verify real‑time subscriptions still work
-- ✅ Verify reports/filtering unchanged
-- ✅ Verify admin/warden/student workflows unchanged
-- ✅ Load test with production-like traffic
-- ✅ Monitor query performance before/after
-- ✅ Have rollback plan ready

-- ------------------------------
-- 6.4: Staging deployment strategy
-- ------------------------------
-- 1. Restore production backup to staging
-- 2. Apply Phase 1 indexes to staging
-- 3. Run full test suite
-- 4. Verify performance improvements
-- 5. Test rollback
-- 6. Wait 24–48 hours for staging soak test
-- 7. Then deploy to production

-- ------------------------------
-- 6.5: Production deployment precautions
-- ------------------------------
-- 1. Deploy during low-traffic hours
-- 2. Have full backup ready
-- 3. Have rollback plan ready
-- 4. Monitor logs closely for 1–2 hours after deployment
-- 5. Have team on standby for any issues
-- 6. Start with Phase 1 (indexes) ONLY - it's the safest
-- 7. Wait at least 1 week before Phase 2 (unique constraints)

-- ================================================================
-- COMPLETE SAFETY PACKAGE SUMMARY
-- ================================================================
-- 1. Phase 1: Apply indexes first - safest, most impactful, no breaking changes
-- 2. Phase 2: Unique constraints - only after application-level duplicate handling
-- 3. RLS: Only apply after extensive staging testing, keep existing auth as primary security
-- 4. Activity logs: Indexes are enough now; optional enhancements later
-- 5. Always back up first, test on staging, have rollback ready!
