const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkHostels() {
  try {
    await client.connect();
    console.log('--- WARDENS ---');
    const wardens = await client.query("SELECT warden_id, name FROM wardens");
    console.table(wardens.rows);

    console.log('--- HOSTELS ---');
    const hostels = await client.query("SELECT hostel_id, hostel_name, warden_id, owner_id FROM hostels");
    console.table(hostels.rows);
    
    await client.end();
  } catch (err) {
    console.error('Error checking hostels:', err);
    process.exit(1);
  }
}

checkHostels();
