const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function runSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');

    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Applying schema...');
    await client.query(schema);
    console.log('Schema applied successfully');

    // Also apply extensions if they exist
    const extensions = ['fees_module_extension.sql', 'fix_cascade_deletion.sql', 'production_fee_system.sql'];
    for (const ext of extensions) {
      const extPath = path.join(__dirname, '..', 'database', ext);
      if (fs.existsSync(extPath)) {
        console.log(`Applying ${ext}...`);
        const extSql = fs.readFileSync(extPath, 'utf8');
        await client.query(extSql);
        console.log(`${ext} applied successfully`);
      }
    }

  } catch (err) {
    console.error('Error applying schema:', err);
  } finally {
    await client.end();
  }
}

runSchema();
