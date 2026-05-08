const db = require('./config/db');

async function debugFees() {
  try {
    console.log('--- DEBUGGING FEES DATA ---');

    // 1. Get all hostels
    const hostelsRes = await db.query('SELECT hostel_id, hostel_name FROM hostels');
    console.log('Hostels:', hostelsRes.rows);

    for (const hostel of hostelsRes.rows) {
      console.log(`\n--- HOSTEL: ${hostel.hostel_name} (ID: ${hostel.hostel_id}) ---`);

      // 2. Check fees for this hostel
      const feesRes = await db.query(`
        SELECT fee_id, student_id, amount, adjustment_amount, paid_amount, status, due_date
        FROM fees
        WHERE hostel_id = $1
        ORDER BY fee_id
      `, [hostel.hostel_id]);

      console.log('Fees:', feesRes.rows);

      // 3. Check payments for this hostel
      const paymentsRes = await db.query(`
        SELECT payment_id, student_id, amount, actual_payment_date
        FROM payments
        WHERE hostel_id = $1
        ORDER BY payment_id
      `, [hostel.hostel_id]);

      console.log('Payments:', paymentsRes.rows);

      // 4. Check students for this hostel
      const studentsRes = await db.query(`
        SELECT student_id, name, total_session_fees, status
        FROM students
        WHERE hostel_id = $1
        ORDER BY student_id
      `, [hostel.hostel_id]);

      console.log('Students:', studentsRes.rows);
    }

    console.log('\n--- DEBUG COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error('--- ERROR IN DEBUG ---', err);
    process.exit(1);
  }
}

debugFees();
