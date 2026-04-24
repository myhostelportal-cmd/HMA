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

async function testPay() {
  try {
    await client.connect();
    console.log('Connected');

    const studentId = 29;
    const fee_id = 87; // Security Deposit
    const amount_paid = 5001;
    const payment_method = 'UPI';
    const transaction_id = 'test_trans_' + Date.now();
    const remarks = 'test';
    const actual_payment_date = new Date();

    await client.query('BEGIN');

    // 1. Fetch Fee and Student
    const feeRes = await client.query('SELECT * FROM fees WHERE fee_id = $1', [fee_id]);
    const fee = feeRes.rows[0];
    const studentRes = await client.query('SELECT * FROM students WHERE student_id = $1', [studentId]);
    const student = studentRes.rows[0];

    // 2. Calculate
    const amountRequired = parseFloat(fee.amount) + parseFloat(fee.adjustment_amount || 0) - parseFloat(fee.paid_amount || 0);
    const paid = parseFloat(amount_paid);
    const balance = amountRequired - paid;

    // 3. Receipt
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const receiptId = `TEST-${Date.now()}`;

    // 4. Update Fee
    await client.query(`
      UPDATE fees SET 
        status = $1, paid_amount = paid_amount + $2, payment_date = $3, 
        payment_method = $4, transaction_id = $5, receipt_id = $6, remarks = $7
      WHERE fee_id = $8
    `, ['paid', paid, actual_payment_date, payment_method, transaction_id, receiptId, remarks, fee_id]);

    // 5. Payments
    const paymentRes = await client.query(`
      INSERT INTO payments (
        fee_id, student_id, hostel_id, amount, payment_method, transaction_id, receipt_id, actual_payment_date, remarks, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed')
      RETURNING payment_id
    `, [fee_id, studentId, student.hostel_id, paid, payment_method, transaction_id, receiptId, actual_payment_date, remarks]);
    const paymentId = paymentRes.rows[0].payment_id;

    // 7. Ledger
    await client.query(`
      INSERT INTO fee_ledger (student_id, hostel_id, transaction_type, amount, balance_after, reference_id, description)
      VALUES ($1, $2, 'Payment', $3, $4, $5, $6)
    `, [studentId, student.hostel_id, paid, balance, paymentId, `Payment for ${fee.installment_name || fee.month}`]);

    await client.query('ROLLBACK');
    console.log('Test successful (rolled back)');
    await client.end();
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
}

testPay();
