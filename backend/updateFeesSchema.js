process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function updateSchema() {
  try {
    const schemaPath = path.join(__dirname, '..', 'database', 'fees_module_extension.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Updating database schema for Fees Module...');
    await pool.query(schema);
    console.log('Schema updated successfully!');
    
    await pool.end();
  } catch (err) {
    console.error('Error updating schema:', err);
    process.exit(1);
  }
}

updateSchema();
