process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
const { initWhatsApp } = require('./services/whatsapp');

const app = express();
const port = process.env.PORT || 5001;
const path = require('path');

// Middleware
const allowedOrigins = [
  'https://hma-nine.vercel.app',
  'https://hma-rho.vercel.app',
  'https://www.myhostell.site',
  'https://myhostell.site',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002'
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

// Serve static files from public folder
app.use('/public', express.static(path.join(__dirname, 'public')));

// Database Test (Using PostgreSQL)
const db = require('./config/db');
db.query('SELECT NOW()', (err, res) => {
  if (err) {
      console.error('--- DB CONNECTION ERROR ON STARTUP ---');
      console.error(`Message: ${err.message}`);
      console.error(`Stack: ${err.stack}`);
    } else {
      console.log('PostgreSQL Database connected successfully at:', res.rows[0].now);
    }
});

// Import Middleware
const { authenticateToken, authorizeRoles } = require('./middleware/auth');

// Import Routes
const authRoutes = require('./routes/auth');
const hostelRoutes = require('./routes/hostel');
const financeRoutes = require('./routes/finance');
const ownerRoutes = require('./routes/owner');
const adminMgmtRoutes = require('./routes/admin_mgmt');
const attendanceRoutes = require('./routes/attendance');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/admin-mgmt', adminMgmtRoutes);
app.use('/api/attendance', attendanceRoutes);

// Health Check Endpoint (For Cron Job and Uptime Monitoring)
app.get('/api/health', async (req, res) => {
  try {
    const { testReminders } = require('./services/whatsapp');
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
      error: 'Database connection failed',
      details: err.message,
      code: err.code
    });
  }
});

// Manual WhatsApp Reminders Endpoint (Warden Only) - Priority Due Alerts Only
app.post('/api/warden/send-reminders', authenticateToken, authorizeRoles('warden', 'admin', 'owner'), async (req, res) => {
  try {
    const { sendPriorityDueReminders, isReady } = require('./services/whatsapp');

    if (!isReady()) {
      return res.status(400).json({ error: 'WhatsApp service not connected. Please scan QR code first.' });
    }

    const user = req.user;
    let hostelId = null;

    if (user.role === 'warden') {
      const wardenHostelRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [user.id]);
      if (wardenHostelRes.rows.length === 0) {
        return res.status(403).json({ error: 'No hostel assigned to this warden' });
      }
      hostelId = wardenHostelRes.rows[0].hostel_id;
    }

    const result = await sendPriorityDueReminders(hostelId);
    
    if (result.success) {
      if (result.totalStudents === 0) {
        res.status(200).json({
          message: 'No priority due alerts found',
          ...result
        });
      } else {
        res.status(200).json({
          message: 'Reminders sent successfully',
          ...result
        });
      }
    } else {
      res.status(500).json({
        error: 'Failed to send reminders',
        details: result.error
      });
    }
  } catch (err) {
    console.error('--- SEND REMINDERS FAILED ---', err);
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

// Test WhatsApp Reminders Endpoint
app.get('/api/test-reminders', async (req, res) => {
  try {
    const { testReminders } = require('./services/whatsapp');
    res.status(200).json({ message: 'Test reminders triggered, check server logs' });
    testReminders();
  } catch (err) {
    console.error('--- TEST REMINDERS FAILED ---', err);
    res.status(500).json({ error: 'Failed to trigger test reminders' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Hostel Management System API is running.' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  initWhatsApp();
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
