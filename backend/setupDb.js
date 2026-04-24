const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres', // Connect to default postgres DB first
  password: 'password', // try default
  port: 5432,
});

async function setup() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Create database if it doesn't exist
    try {
      await client.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log(`Database ${process.env.DB_NAME} created`);
    } catch (err) {
      if (err.code === '42P04') {
        console.log(`Database ${process.env.DB_NAME} already exists`);
      } else {
        throw err;
      }
    }
    await client.end();

    // Connect to the new database
    const dbClient = new Client({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
    });

    await dbClient.connect();
    console.log(`Connected to ${process.env.DB_NAME}`);

    // Read and execute schema
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await dbClient.query(schema);
    console.log('Schema executed successfully');

    await dbClient.end();
  } catch (err) {
    console.error('Error during database setup:', err);
    process.exit(1);
  }
}

setup();
