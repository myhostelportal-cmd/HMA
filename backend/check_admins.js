process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkAdmins() {
  try {
    console.log('Checking admins table...');
    const result = await pool.query('SELECT * FROM admins');
    console.log('Admins in DB:', result.rows);
    console.log('\nTotal admins:', result.rows.length);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkAdmins();
