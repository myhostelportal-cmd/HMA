const pg = require('pg');
const pool = new pg.Pool({ 
    user: 'postgres',
    host: 'localhost',
    database: 'hostel_db',
    password: 'Apoorv123@',
    port: 5432
});

async function inspectStudentsTable() {
    try {
        console.log('--- INSPECTING STUDENTS TABLE ---');
        
        // Check columns in students table
        const columnsRes = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'students'
            ORDER BY ordinal_position
        `);
        
        console.log('Columns in students table:');
        console.table(columnsRes.rows);

        // Check for unique constraints or indexes
        const constraintsRes = await pool.query(`
            SELECT conname, contype
            FROM pg_constraint
            WHERE conrelid = 'students'::regclass
        `);
        console.log('\nConstraints on students table:');
        console.table(constraintsRes.rows);

        process.exit(0);
    } catch (err) {
        console.error('Error inspecting table:', err);
        process.exit(1);
    }
}

inspectStudentsTable();
