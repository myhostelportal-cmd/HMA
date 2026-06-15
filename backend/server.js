const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Load environment variables first
require('dotenv').config();

const whatsappMulti = require('./services/whatsapp-multi');
const emailReminders = require('./services/email-reminders');
const db = require('./config/db');

const app = express();
const port = process.env.PORT || 5001;

// Function to apply WhatsApp sessions migration
async function applyWhatsAppMigration() {
  try {
    console.log('Checking/updating WhatsApp sessions table...');
    
    const createTableSQL = 'CREATE TABLE IF NOT EXISTS warden_whatsapp_sessions (warden_id INTEGER PRIMARY KEY REFERENCES wardens(warden_id) ON DELETE CASCADE, hostel_id INTEGER REFERENCES hostels(hostel_id) ON DELETE SET NULL, owner_id INTEGER REFERENCES owners(owner_id) ON DELETE SET NULL, status VARCHAR(20) DEFAULT \'disconnected\', connected_phone VARCHAR(20), last_connected TIMESTAMP, qr_code_path TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)';
    
    await db.query(createTableSQL);
    
    // Now create/update the timestamp trigger
    const createTriggerSQL = 'CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$ LANGUAGE plpgsql;';
    
    await db.query(createTriggerSQL);
    
    // Drop existing trigger if any and recreate
    await db.query('DROP TRIGGER IF EXISTS update_warden_whatsapp_sessions_updated_at ON warden_whatsapp_sessions');
    
    await db.query('CREATE TRIGGER update_warden_whatsapp_sessions_updated_at BEFORE UPDATE ON warden_whatsapp_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()');
    
    console.log('✅ WhatsApp sessions table is ready!');
  } catch (err) {
    console.error('❌ Error applying WhatsApp migration:', err);
  }
}

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
db.query('SELECT NOW()', (err, res) => {
  if (err) {
      console.error('--- DB CONNECTION ERROR ON STARTUP ---');
      console.error('Message:', err.message);
      console.error('Stack:', err.stack);
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

// ==================== WhatsApp Integration Endpoints ====================

// Get WhatsApp status for current warden
app.get('/api/warden/whatsapp/status', authenticateToken, authorizeRoles('warden'), async (req, res) => {
  try {
    console.log('[WhatsApp] Getting status for warden:', req.user.id);
    const status = await whatsappMulti.getSessionStatus(req.user.id);
    console.log('[WhatsApp] Status result:', status);
    res.status(200).json(status);
  } catch (err) {
    console.error('[WhatsApp] Error getting status:', err);
    console.error('[WhatsApp] Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to get WhatsApp status', details: err.message });
  }
});

// Connect WhatsApp for current warden
app.post('/api/warden/whatsapp/connect', authenticateToken, authorizeRoles('warden'), async (req, res) => {
  try {
    console.log('[WhatsApp] Connecting for warden:', req.user.id);
    await whatsappMulti.initWardenSession(req.user.id, true);
    res.status(200).json({ message: 'WhatsApp connection initiated, please scan QR code' });
  } catch (err) {
    console.error('[WhatsApp] Error connecting:', err);
    console.error('[WhatsApp] Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to connect WhatsApp', details: err.message });
  }
});

// Disconnect WhatsApp for current warden
app.post('/api/warden/whatsapp/disconnect', authenticateToken, authorizeRoles('warden'), async (req, res) => {
  try {
    console.log('[WhatsApp] Disconnecting for warden:', req.user.id);
    await whatsappMulti.destroyWardenSession(req.user.id);
    res.status(200).json({ message: 'WhatsApp disconnected successfully' });
  } catch (err) {
    console.error('[WhatsApp] Error disconnecting:', err);
    console.error('[WhatsApp] Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to disconnect WhatsApp', details: err.message });
  }
});

// Updated Manual WhatsApp Reminders Endpoint (Warden Only)
app.post('/api/warden/send-reminders', authenticateToken, authorizeRoles('warden', 'admin', 'owner'), async (req, res) => {
  try {
    const user = req.user;
    
    if (user.role !== 'warden') {
      return res.status(403).json({ error: 'Only wardens can send reminders' });
    }

    const result = await whatsappMulti.sendPriorityDueReminders(user.id);
    
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
      res.status(400).json({
        error: result.error || 'Failed to send reminders'
      });
    }
  } catch (err) {
    console.error('[WhatsApp] Send reminders failed:', err);
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

// Manual Email Reminders Endpoint (Warden Only)
app.post('/api/warden/send-email-reminders', authenticateToken, authorizeRoles('warden', 'admin', 'owner'), async (req, res) => {
  try {
    const user = req.user;
    
    if (user.role !== 'warden') {
      return res.status(403).json({ error: 'Only wardens can send reminders' });
    }

    const result = await emailReminders.sendPriorityDueEmailReminders(user.id);
    
    if (result.success) {
      if (result.totalStudents === 0) {
        res.status(200).json({
          message: 'No priority due alerts found',
          ...result
        });
      } else {
        res.status(200).json({
          message: 'Email reminders sent successfully',
          ...result
        });
      }
    } else {
      res.status(400).json({
        error: result.error || 'Failed to send email reminders'
      });
    }
  } catch (err) {
    console.error('[Email] Send reminders failed:', err);
    res.status(500).json({ error: 'Failed to send email reminders' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Hostel Management System API is running.' });
});

app.listen(port, async () => {
  console.log('Server is running on port', port);
  // Apply WhatsApp migration
  await applyWhatsAppMigration();
  // Restore existing WhatsApp sessions
  whatsappMulti.restoreSessions();
});

// Force keep-alive
setInterval(() => {}, 1000000);

console.log('--- SERVER STARTUP COMPLETE ---');

process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('exit', (code) => {
  console.log('--- SERVER PROCESS EXITING WITH CODE:', code, '---');
});
