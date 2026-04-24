
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function testQuery() {
  try {
    const studentIdInt = 1; // Try with any ID
    console.log('Testing query for student ID:', studentIdInt);
    const result = await pool.query(`
      SELECT 
        s.*, 
        COALESCE(s.security_balance::text, '0')::float as security_balance,
        r.room_number, 
        r.room_type,
        r.capacity as room_capacity,
        COALESCE(r.floor, s.details->>'floor') as floor,
        h.hostel_name,
        w.name as warden_name
      FROM students s 
      LEFT JOIN rooms r ON s.room_id = r.room_id 
      LEFT JOIN hostels h ON s.hostel_id = h.hostel_id 
      LEFT JOIN wardens w ON h.warden_id = w.warden_id
      WHERE s.student_id = $1
    `, [studentIdInt]);
    console.log('Query successful, rows:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('Sample row:', JSON.stringify(result.rows[0], null, 2));
    }
  } catch (err) {
    console.error('Query failed with error:', err.message);
    console.error('Stack trace:', err.stack);
  } finally {
    process.exit();
  }
}

testQuery();
