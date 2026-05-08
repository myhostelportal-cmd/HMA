const db = require('./config/db');

async function debugRooms() {
  try {
    console.log('--- DEBUGGING ROOMS & STUDENTS ---');
    
    // Get students with room info
    const studentsRes = await db.query(`
      SELECT 
        s.student_id,
        s.name,
        s.room_id,
        r.room_number,
        r.capacity
      FROM students s
      LEFT JOIN rooms r ON s.room_id = r.room_id
      ORDER BY s.student_id
    `);
    
    console.log('Students with room info:', studentsRes.rows);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

debugRooms();
