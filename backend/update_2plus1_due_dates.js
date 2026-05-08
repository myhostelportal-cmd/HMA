const db = require('./config/db');

async function updateDueDates() {
  try {
    console.log('--- STARTING DUE DATE UPDATE FOR 2+1 SYSTEM ---');

    // 1. Get all students on 2+1 System
    const studentsRes = await db.query(`
      SELECT student_id, joining_date 
      FROM students 
      WHERE payment_model = '2 + 1 System'
    `);

    const students = studentsRes.rows;
    console.log(`Found ${students.length} students on 2+1 System`);

    for (const student of students) {
      const { student_id, joining_date } = student;
      console.log(`\n--- Processing student ID: ${student_id}, joining date: ${joining_date} ---`);

      // 2. Get all monthly fees for this student ordered by period_start
      const feesRes = await db.query(`
        SELECT fee_id, period_start 
        FROM fees 
        WHERE student_id = $1 
          AND fee_type = 'monthly'
        ORDER BY period_start ASC
      `, [student_id]);

      const fees = feesRes.rows;
      console.log(`Found ${fees.length} monthly fees for this student`);

      for (let i = 0; i < fees.length; i++) {
        const { fee_id, period_start } = fees[i];
        
        let newDueDate;
        if (i < 3) {
          // First 3 months: use joining date
          const joiningDateObj = new Date(joining_date);
          newDueDate = joiningDateObj.toISOString().split('T')[0];
        } else {
          // 4th month onwards: use 1st of the period_start month
          const periodStartDate = new Date(period_start);
          const firstOfMonth = new Date(periodStartDate.getFullYear(), periodStartDate.getMonth(), 1);
          newDueDate = firstOfMonth.toISOString().split('T')[0];
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

    console.log('\n--- DUE DATE UPDATE COMPLETED SUCCESSFULLY ---');
    process.exit(0);
  } catch (err) {
    console.error('--- ERROR UPDATING DUE DATES ---', err);
    process.exit(1);
  }
}

updateDueDates();
