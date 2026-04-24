const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function reset() {
  try {
    const salt = await bcrypt.genSalt(10);
    
    // Reset Admin
    const hashedAdmin = await bcrypt.hash('admin@123', salt);
    await db.query('UPDATE admins SET password = $1 WHERE email = $2', [hashedAdmin, 'admin@info.com']);
    
    // Reset Warden
    const hashedWarden = await bcrypt.hash('warden@123', salt);
    await db.query('UPDATE wardens SET password = $1 WHERE email = $2', [hashedWarden, 'yugal@gmail.com']);
    
    console.log('Passwords reset successfully');
  } catch (err) {
    console.error('Reset Error:', err);
  } finally {
    process.exit();
  }
}

reset();
