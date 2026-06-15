process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();

if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') || process.env.DATABASE_URL.includes('supabase') || process.env.DATABASE_URL.includes('aivencloud.com')
      ? { rejectUnauthorized: false }
      : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  });

  module.exports = {
    query: (text, params) => pool.query(text, params),
  };
} else {
  module.exports = require('./mockDb');
}
