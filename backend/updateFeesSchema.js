const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
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
