const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hostel_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function resetPassword() {
  const email = 'yugal@gmail.com';
  const newPassword = 'password123';
  
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Check if warden exists first
    const checkRes = await pool.query('SELECT * FROM wardens WHERE email = $1', [email]);
    
    if (checkRes.rows.length === 0) {
      console.log(`Warden with email ${email} not found.`);
      process.exit(1);
    }

    console.log(`Found warden: ${checkRes.rows[0].name}`);
    console.log(`Old hash: ${checkRes.rows[0].password}`);
    
    // Test if password123 matches current hash
    const currentMatch = await bcrypt.compare(newPassword, checkRes.rows[0].password);
    console.log(`Current Hash Match (before update): ${currentMatch}`);

    const result = await pool.query(
      'UPDATE wardens SET password = $1 WHERE email = $2 RETURNING *',
      [hashedPassword, email]
    );
    
    console.log(`Password reset successful for ${email}`);
    console.log(`New hash: ${hashedPassword}`);
    
    // Verification check
    const isMatch = await bcrypt.compare(newPassword, result.rows[0].password);
    console.log(`Verification - Match: ${isMatch}`);
    
    await pool.end();
  } catch (err) {
    console.error('Error resetting password:', err);
    process.exit(1);
  }
}

resetPassword();
