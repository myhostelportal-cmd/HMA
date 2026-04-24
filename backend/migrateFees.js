const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
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
