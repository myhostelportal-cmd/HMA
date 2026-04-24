const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  const email = 'admin@info.com';
  const newPassword = 'admin@123';
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    const result = await db.query(
      'UPDATE admins SET password = $1 WHERE email = $2 RETURNING *',
      [hashedPassword, email]
    );
    if (result.rows.length > 0) {
      console.log(`Password reset successfully for ${email}`);
    } else {
      console.log(`User ${email} not found.`);
    }
  } catch (err) {
    console.error('Error resetting password:', err);
  } finally {
    process.exit();
  }
}

resetPassword();
