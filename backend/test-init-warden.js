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
    console.log('Testing initWardenSession with warden id:', wardenId);
    
    await whatsappMulti.initWardenSession(wardenId, true);
    console.log('initWardenSession complete!');
    
    // Keep the process alive for a bit to see if QR code is generated
    setTimeout(() => {
      console.log('Checking status after 10 seconds...');
      whatsappMulti.getSessionStatus(wardenId).then(status => {
        console.log('Final status:', status);
        process.exit(0);
      });
    }, 10000);
  } catch (err) {
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

test();
