const whatsappMulti = require('./services/whatsapp-multi');
const db = require('./config/db');

async function test() {
  try {
    // First get a warden id from the database
    const wardens = await db.query('SELECT warden_id FROM wardens LIMIT 1');
    if (wardens.rows.length === 0) {
      console.log('No wardens found in database!');
      process.exit(0);
    }
    
    const wardenId = wardens.rows[0].warden_id;
    console.log('Testing with warden id:', wardenId);
    
    const status = await whatsappMulti.getSessionStatus(wardenId);
    console.log('Session status result:', status);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

test();
