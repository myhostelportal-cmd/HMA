const db = require('./config/db');

async function checkConstraints() {
  try {
    console.log('🔍 Checking foreign key constraints for hostels table...');
    const result = await db.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc 
        ON rc.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'hostels';
    `);
    
    console.log('📋 Foreign keys referencing hostels:');
    result.rows.forEach(row => {
      console.log(`- Table: ${row.table_name}, Column: ${row.column_name}, Delete Rule: ${row.delete_rule}`);
    });
  } catch (err) {
    console.error('❌ Error checking constraints:', err);
  } finally {
    process.exit(0);
  }
}

checkConstraints();
