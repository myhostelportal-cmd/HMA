const db = require('./config/db');

async function testProfile(studentId) {
  try {
    console.log(`Testing profile fetch for student_id: ${studentId}`);
    const result = await db.query(`
      SELECT
        s.*,
        s.security_balance::float as security_balance,
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
    `, [studentId]);

    if (result.rows.length === 0) {
      console.log('Student not found');
    } else {
      console.log('Success:', JSON.stringify(result.rows[0], null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
  }
  process.exit();
}

testProfile(1);