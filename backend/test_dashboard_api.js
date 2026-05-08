const db = require('./config/db');

async function testAPI() {
  try {
    console.log('--- TESTING DASHBOARD API QUERIES ---');

    // Test with hostel_id = 1 (since that's the one in the screenshot)
    const hostelId = 1;

    const res = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM students WHERE hostel_id = $1 AND status = 'active') as "totalStudents",
        (SELECT SUM(capacity) FROM rooms WHERE hostel_id = $1) as "totalRooms",
        (SELECT COUNT(*) FROM rooms WHERE hostel_id = $1 AND status = 'available') as "availableRooms",
        -- Calculate pending fees: sum of (amount + adjustment - paid_amount) for all unpaid/partial fees
        (SELECT COALESCE(SUM(amount + COALESCE(adjustment_amount, 0) - COALESCE(paid_amount, 0)), 0) 
         FROM fees 
         WHERE hostel_id = $1 AND status != 'paid') as "pendingFees",
        -- Calculate total expected fees: sum of all students' total_session_fees
        (SELECT COALESCE(SUM(total_session_fees), 0) 
         FROM students 
         WHERE hostel_id = $1 AND status = 'active') as "totalExpectedFees",
        -- Calculate total collected fees: sum of all payments for the hostel
        (SELECT COALESCE(SUM(amount), 0) 
         FROM payments 
         WHERE hostel_id = $1) as "totalCollectedFees"
    `, [hostelId]);

    console.log('Query results:', res.rows[0]);

    // Also check what fees are there for this hostel
    const feesRes = await db.query(`
      SELECT fee_id, amount, adjustment_amount, paid_amount, status
      FROM fees
      WHERE hostel_id = $1
    `, [hostelId]);
    console.log('Fees for hostel:', feesRes.rows);

    process.exit(0);
  } catch (err) {
    console.error('--- ERROR ---', err);
    process.exit(1);
  }
}

testAPI();
