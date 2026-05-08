const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function verifyWardenDetails(wardenId) {
  try {
    await client.connect();
    console.log(`--- Verifying Details for Warden ID: ${wardenId} ---`);
    
    // Check warden existence
    const wardenResult = await client.query('SELECT * FROM wardens WHERE warden_id = $1', [wardenId]);
    if (wardenResult.rows.length === 0) {
      console.log('Warden not found');
      await client.end();
      return;
    }
    console.log('Warden found:', wardenResult.rows[0].name);

    // Check assigned hostels (using the logic from the fixed API)
    const hostelsResult = await client.query(`
      SELECT h.*, o.name as owner_name 
      FROM hostels h 
      LEFT JOIN owners o ON h.owner_id = o.owner_id 
      WHERE h.warden_id = $1
    `, [wardenId]);
    
    console.log(`Found ${hostelsResult.rows.length} assigned hostels:`);
    console.table(hostelsResult.rows.map(h => ({
      hostel_id: h.hostel_id,
      hostel_name: h.hostel_name,
      owner_name: h.owner_name
    })));

    await client.end();
  } catch (err) {
    console.error('Error verifying warden details:', err);
    process.exit(1);
  }
}

// Check for Warden 2 (Kuldeep Nagar) which was showing "No hostels assigned" in the image
verifyWardenDetails(2);
