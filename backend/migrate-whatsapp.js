const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
  try {
    console.log('Applying WhatsApp sessions migration...');
    
    const migrationPath = path.join(__dirname, '..', 'database', 'warden_whatsapp_sessions.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    await db.query(migration);
    
    console.log('✅ WhatsApp sessions migration applied successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error applying migration:', err);
    process.exit(1);
  }
}

migrate();
