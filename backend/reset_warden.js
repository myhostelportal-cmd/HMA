const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function reset() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('warden@123', salt);
    const result = await db.query(
      'UPDATE wardens SET password = $1 WHERE email = $2 RETURNING *',
      [hashed, 'yugal@gmail.com']
    );
    if (result.rows.length > 0) {
      console.log('Warden password reset successfully for yugal@gmail.com');
    } else {
      console.log('Warden yugal@gmail.com not found.');
    }
  } catch (err) {
    console.error('Error resetting warden password:', err);
  } finally {
    process.exit();
  }
}

reset();
