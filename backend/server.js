process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001;

// Middleware
const allowedOrigins = [
  'https://hma-nine.vercel.app',
  'https://hma-rho.vercel.app',
  'https://www.myhostell.site',
  'https://myhostell.site',
  'http://localhost:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.FRONTEND_URL === origin) {
      callback(null, true);
    } else {
      console.log('CORS Blocked for origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Database Test (Using PostgreSQL)
const db = require('./config/db');
db.query('SELECT NOW()', (err, res) => {
  if (err) {
      console.error('Error connecting to PostgreSQL database:', err);
    } else {
      console.log('PostgreSQL Database connected successfully at:', res.rows[0].now);
    }
});

// Import Routes
const authRoutes = require('./routes/auth');
const hostelRoutes = require('./routes/hostel');
const financeRoutes = require('./routes/finance');
const ownerRoutes = require('./routes/owner');
const adminMgmtRoutes = require('./routes/admin_mgmt');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/admin-mgmt', adminMgmtRoutes);

// Health Check Endpoint (For Cron Job and Uptime Monitoring)
app.get('/api/health', async (req, res) => {
  try {
    // Check Database Connection
    const dbResult = await db.query('SELECT NOW()');
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      server_time: new Date().toISOString(),
      db_time: dbResult.rows[0].now
    });
  } catch (err) {
    console.error('--- HEALTH CHECK FAILED ---', err);
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: 'Database connection failed'
    });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Hostel Management System API is running.' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Force keep-alive
setInterval(() => {}, 1000000);

console.log('--- SERVER STARTUP COMPLETE ---');

process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('exit', (code) => {
  console.log(`--- SERVER PROCESS EXITING WITH CODE: ${code} ---`);
});
