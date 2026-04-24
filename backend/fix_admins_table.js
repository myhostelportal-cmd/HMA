const db = require('./config/db');

async function fixAdminsTable() {
  console.log('--- STARTING ADMINS TABLE FIX ---');
  try {
    // 1. Check existing columns again
    const colRes = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'admins';
    `);
    const existingCols = colRes.rows.map(r => r.column_name);
    console.log('Current columns:', existingCols);

    // 2. Add missing columns with proper defaults
    const queries = [
      'ALTER TABLE admins ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT \'active\';',
      'ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT \'Super Admin\';',
      'ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone VARCHAR(20);',
      'ALTER TABLE admins ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;',
      'ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_token TEXT;',
      'ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_expiry TIMESTAMP;'
    ];

    for (const q of queries) {
      console.log(`Executing: ${q}`);
      await db.query(q);
    }

    // 3. Update existing rows to have default values if they are NULL
    await db.query(`
      UPDATE admins 
      SET status = 'active' WHERE status IS NULL;
    `);
    await db.query(`
      UPDATE admins 
      SET role = 'Super Admin' WHERE role IS NULL;
    `);
    await db.query(`
      UPDATE admins 
      SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
    `);

    console.log('Admins table updated successfully with all required columns and default data.');

  } catch (err) {
    console.error('Fix failed:', err);
  } finally {
    process.exit();
  }
}

fixAdminsTable();
