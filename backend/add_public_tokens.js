process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};

async function migrate() {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // 1. Add public_token column to payments table if it doesn't exist
    await client.query(`
      ALTER TABLE payments 
      ADD COLUMN IF NOT EXISTS public_token UUID UNIQUE DEFAULT gen_random_uuid()
    `);
    console.log('Added public_token column to payments table');

    // 2. Add public_token column to fees table as well for those payments recorded directly in fees (legacy or single payments)
    await client.query(`
      ALTER TABLE fees 
      ADD COLUMN IF NOT EXISTS public_token UUID UNIQUE DEFAULT gen_random_uuid()
    `);
    console.log('Added public_token column to fees table');

    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
