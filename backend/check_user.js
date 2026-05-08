const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function checkUserAuth() {
  const email = 'yugal@gmail.com';
  const password = 'warden@123';
  try {
    const result = await db.query('SELECT * FROM wardens WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      console.log('User not found');
    } else {
      const user = result.rows[0];
      console.log('User found:', user.email);
      console.log('Stored hash:', user.password);
      const isMatch = await bcrypt.compare(password, user.password);
      console.log('Password match:', isMatch);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

checkUserAuth();
