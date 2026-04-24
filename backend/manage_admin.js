const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function manageAdmin() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: node manage_admin.js <name> <email> <password>');
    console.log('Example: node manage_admin.js "John Doe" "john@example.com" "password123"');
    process.exit(1);
  }

  const name = args[0];
  const email = args[1];
  const password = args[2];

  try {
    console.log(`Checking if admin with email ${email} exists...`);
    const res = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);

    if (res.rows.length > 0) {
      console.log('Admin already exists. Updating password...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await pool.query('UPDATE admins SET password = $1, name = $2 WHERE email = $3', [hashedPassword, name, email]);
      console.log('Admin password and name updated successfully.');
    } else {
      console.log('Admin does not exist. Creating new admin...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await pool.query('INSERT INTO admins (name, email, password) VALUES ($1, $2, $3)', [name, email, hashedPassword]);
      console.log('Admin created successfully.');
    }
  } catch (err) {
    console.error('Error during admin management:', err.message);
  } finally {
    await pool.end();
  }
}

manageAdmin();
