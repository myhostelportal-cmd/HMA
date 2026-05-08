process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrate() {
  try {
    await client.connect();
    console.log(`Connected to ${process.env.DB_NAME}`);

    // Read and execute schema
    const schemaPath = path.join(__dirname, '..', 'database', 'production_fee_system.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);
    console.log('Production Fee System Schema executed successfully');

    await client.end();
  } catch (err) {
    console.error('Error during database migration:', err);
    process.exit(1);
  }
}

migrate();
