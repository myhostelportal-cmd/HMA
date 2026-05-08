const pg = require('pg');
const pool = new pg.Pool({ 
    user: 'postgres',
    host: 'localhost',
    database: 'hostel_db',
    password: 'Apoorv123@',
    port: 5432
});

async function checkCounts() {
    try {
        console.log('--- DB DIAGNOSTIC START ---');
        
        // Check all hostels
        const hAllRes = await pool.query('SELECT hostel_id, hostel_name, warden_id FROM hostels');
        console.log('All Hostels:', JSON.stringify(hAllRes.rows, null, 2));
        
        // Check all wardens
        const wAllRes = await pool.query('SELECT warden_id, name FROM wardens');
        console.log('All Wardens:', JSON.stringify(wAllRes.rows, null, 2));

        for (const hostel of hAllRes.rows) {
            console.log(`\n--- Stats for Hostel: ${hostel.hostel_name} (ID: ${hostel.hostel_id}) ---`);
            console.log(`Assigned Warden ID: ${hostel.warden_id}`);
            
            const roomsRes = await pool.query('SELECT COUNT(*) FROM rooms WHERE hostel_id = $1', [hostel.hostel_id]);
            const studentsRes = await pool.query('SELECT COUNT(*) FROM students WHERE hostel_id = $1 AND status = \'active\'', [hostel.hostel_id]);
            
            const availableRoomsQuery = `
              SELECT COUNT(*) FROM rooms r
              WHERE r.hostel_id = $1
              AND (
                SELECT COUNT(*) FROM students s 
                WHERE s.room_id = r.room_id 
                AND s.status = 'active'
              ) < r.capacity
            `;
            const availableRoomsRes = await pool.query(availableRoomsQuery, [hostel.hostel_id]);

            console.log(`Total Rooms: ${roomsRes.rows[0].count}`);
            console.log(`Active Students: ${studentsRes.rows[0].count}`);
            console.log(`Available Rooms (with vacancies): ${availableRoomsRes.rows[0].count}`);
        }
        
        console.log('\n--- DB DIAGNOSTIC END ---');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkCounts();
