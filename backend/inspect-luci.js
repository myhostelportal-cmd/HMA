const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function inspect() {
  try {
    await client.connect();
    console.log(`Connected to ${process.env.DB_NAME}`);

    const res = await client.query("SELECT student_id, name, security_balance FROM students WHERE student_id = 75 OR name ILIKE '%LUCI%';");
    console.log('Student Info:', JSON.stringify(res.rows, null, 2));

    if (res.rows.length > 0) {
      const studentId = res.rows[0].student_id;
      const fees = await client.query("SELECT fee_id, installment_name, amount, paid_amount, status, adjustment_amount FROM fees WHERE student_id = $1 ORDER BY due_date DESC LIMIT 10;", [studentId]);
      console.log('Recent Fees Info:', JSON.stringify(fees.rows, null, 2));
    }

    await client.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

inspect();
