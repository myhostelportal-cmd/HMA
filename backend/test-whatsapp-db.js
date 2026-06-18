const db = require('./config/db');

async function test() {
  try {
    console.log('Testing database connection for WhatsApp sessions...');
    
    // Check if table exists
    const checkTable = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'warden_whatsapp_sessions'
      );
    `);
    console.log('Table exists:', checkTable.rows[0].exists);
    
    if (checkTable.rows[0].exists) {
      // Check columns
      const columns = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'warden_whatsapp_sessions'
        ORDER BY ordinal_position;
      `);
      console.log('Columns:', columns.rows.map(r => r.column_name));
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

test();
