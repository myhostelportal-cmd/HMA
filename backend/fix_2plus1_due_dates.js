const db = require('./config/db');

async function fixDueDates() {
  try {
    console.log('--- STARTING FIX FOR 2+1 SYSTEM DUE DATES ---');

    // 1. Get all students on 2+1 System with raw joining_date (as string)
    const studentsRes = await db.query(`
      SELECT student_id, TO_CHAR(joining_date, 'YYYY-MM-DD') as joining_date_str
      FROM students 
      WHERE payment_model = '2 + 1 System'
    `);

    const students = studentsRes.rows;
    console.log(`Found ${students.length} students on 2+1 System`);

    for (const student of students) {
      const { student_id, joining_date_str } = student;
      console.log(`\n--- Processing student ID: ${student_id}, joining date: ${joining_date_str} ---`);

      // 2. Get all monthly fees for this student ordered by period_start
      const feesRes = await db.query(`
        SELECT fee_id, TO_CHAR(period_start, 'YYYY-MM-DD') as period_start_str
        FROM fees 
        WHERE student_id = $1 
          AND fee_type = 'monthly'
        ORDER BY period_start ASC
      `, [student_id]);

      const fees = feesRes.rows;
      console.log(`Found ${fees.length} monthly fees for this student`);

      for (let i = 0; i < fees.length; i++) {
        const { fee_id, period_start_str } = fees[i];
        
        let newDueDate;
        if (i < 3) {
          // First 3 months: use joining date directly
          newDueDate = joining_date_str;
        } else {
          // 4th month onwards: extract year and month from period_start, set day to 01
          const [year, month] = period_start_str.split('-');
          newDueDate = `${year}-${month}-01`;
        }

        console.log(`  Fee ID ${fee_id} (index ${i}): setting due date to ${newDueDate}`);

        // Update the fee record
        await db.query(`
          UPDATE fees 
          SET due_date = $1 
          WHERE fee_id = $2
        `, [newDueDate, fee_id]);
      }
    }

    console.log('\n--- DUE DATE FIX COMPLETED SUCCESSFULLY ---');
    process.exit(0);
  } catch (err) {
    console.error('--- ERROR FIXING DUE DATES ---', err);
    process.exit(1);
  }
}

fixDueDates();
