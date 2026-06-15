const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const cron = require('node-cron');

// Session storage
const sessions = new Map(); // wardenId -> { client, isReady, qrCode }
const SESSIONS_DIR = path.join(__dirname, '../.wwebjs_sessions');

// Create sessions directory if it doesn't exist
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Create public directory for QR codes
const PUBLIC_DIR = path.join(__dirname, '../public');
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

/**
 * Get warden's WhatsApp session from database
 */
async function getWardenSession(wardenId) {
  const result = await db.query(
    'SELECT * FROM warden_whatsapp_sessions WHERE warden_id = $1',
    [wardenId]
  );
  return result.rows[0] || null;
}

/**
 * Update warden's WhatsApp session in database
 */
async function updateWardenSession(wardenId, updates) {
  const keys = Object.keys(updates);
  const values = Object.values(updates);
  
  const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
  
  await db.query(
    `INSERT INTO warden_whatsapp_sessions (warden_id, ${keys.join(', ')}) 
     VALUES ($1, ${values.map((_, i) => `$${i + 2}`).join(', ')})
     ON CONFLICT (warden_id) 
     DO UPDATE SET ${setClause}`,
    [wardenId, ...values]
  );
}

/**
 * Initialize a WhatsApp session for a warden
 */
async function initWardenSession(wardenId, forceReset = false) {
  console.log(`[WhatsApp] Initializing session for warden ${wardenId}`);

  // Clean up existing session if exists
  if (sessions.has(wardenId)) {
    await destroyWardenSession(wardenId);
  }

  // Get warden's hostel and owner info
  const wardenResult = await db.query(
    `SELECT w.*, h.hostel_id, h.owner_id 
     FROM wardens w 
     LEFT JOIN hostels h ON w.warden_id = h.warden_id 
     WHERE w.warden_id = $1`,
    [wardenId]
  );
  
  if (wardenResult.rows.length === 0) {
    throw new Error('Warden not found');
  }
  
  const warden = wardenResult.rows[0];
  const sessionDir = path.join(SESSIONS_DIR, `warden_${wardenId}`);

  // Reset session directory if forced
  if (forceReset && fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }

  // Create session directory
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // Update database status to qr_pending
  await updateWardenSession(wardenId, {
    hostel_id: warden.hostel_id,
    owner_id: warden.owner_id,
    status: 'qr_pending'
  });

  // Determine Chrome executable path (works locally and on Render)
  let executablePath;
  try {
    const puppeteer = require('puppeteer');
    executablePath = await puppeteer.executablePath();
  } catch (e) {
    console.log('[WhatsApp] puppeteer.executablePath() failed, trying Render-specific path');
    // On Render, find Chrome in /opt/render/project/.chrome
    const baseDir = '/opt/render/project/.chrome/chrome';
    if (fs.existsSync(baseDir)) {
      const dirs = fs.readdirSync(baseDir);
      for (const dir of dirs) {
        const possiblePath = path.join(baseDir, dir, 'chrome-linux64', 'chrome');
        if (fs.existsSync(possiblePath)) {
          executablePath = possiblePath;
          console.log('[WhatsApp] Found Chrome at Render path:', executablePath);
          break;
        }
      }
    }
  }
  
  // Log the final Chrome path for debugging
  console.log('[WhatsApp] Using Chrome executable path:', executablePath);
  if (executablePath && !fs.existsSync(executablePath)) {
    console.error('[WhatsApp] Chrome executable does NOT exist at path:', executablePath);
  }

  // ==================== ADD DETAILED LOGGING HERE ====================
  const puppeteer = require('puppeteer');
  
  console.log('\n[WhatsApp DIAGNOSTICS] =======================================');
  console.log('1. process.env.PUPPETEER_CACHE_DIR:', process.env.PUPPETEER_CACHE_DIR);
  console.log('2. process.env.PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);
  
  const puppeteerExePath = await puppeteer.executablePath();
  console.log('3. await puppeteer.executablePath():', puppeteerExePath);
  
  const puppeteerExeExists = fs.existsSync(puppeteerExePath);
  console.log('4. fs.existsSync(await puppeteer.executablePath()):', puppeteerExeExists);
  
  // Recursively scan and print folders
  function scanDirectory(dir, depth = 0) {
    if (!fs.existsSync(dir)) {
      console.log('   '.repeat(depth) + `[NOT FOUND] ${dir}`);
      return;
    }
    
    try {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      console.log('   '.repeat(depth) + `[DIR] ${dir}`);
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          scanDirectory(fullPath, depth + 1);
        } else {
          console.log('   '.repeat(depth + 1) + `[FILE] ${file.name}`);
        }
      }
    } catch (err) {
      console.log('   '.repeat(depth) + `[ERROR] Cannot scan ${dir}:`, err.message);
    }
  }
  
  console.log('\n5. Scanning /opt/render/project/.chrome:');
  scanDirectory('/opt/render/project/.chrome');
  
  console.log('\n6. Scanning /opt/render/.cache/puppeteer:');
  scanDirectory('/opt/render/.cache/puppeteer');
  console.log('[WhatsApp DIAGNOSTICS] =======================================\n');
  // ==================== END OF DETAILED LOGGING ====================
  
  // Initialize WhatsApp client
  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: sessionDir
    }),
    puppeteer: {
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });

  // Store session
  sessions.set(wardenId, {
    client,
    isReady: false,
    qrCode: null
  });

  // QR code event
  client.on('qr', async (qr) => {
    console.log(`[WhatsApp] QR code generated for warden ${wardenId}`);
    try {
      const qrPath = path.join(PUBLIC_DIR, `qr_warden_${wardenId}.png`);
      
      if (fs.existsSync(qrPath)) {
        fs.unlinkSync(qrPath);
      }

      await QRCode.toFile(qrPath, qr, {
        width: 500,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      sessions.get(wardenId).qrCode = `/public/qr_warden_${wardenId}.png`;
      
      await updateWardenSession(wardenId, {
        qr_code_path: `/public/qr_warden_${wardenId}.png`,
        status: 'qr_pending'
      });
      
    } catch (err) {
      console.error(`[WhatsApp] Error generating QR for warden ${wardenId}:`, err);
    }
  });

  // Authenticated event
  client.on('authenticated', () => {
    console.log(`[WhatsApp] Warden ${wardenId} authenticated successfully`);
  });

  // Ready event
  client.on('ready', async () => {
    console.log(`[WhatsApp] Warden ${wardenId} session ready`);
    sessions.get(wardenId).isReady = true;
    
    // Get connected phone number
    const number = client.info.wid.user;
    const formattedNumber = number.startsWith('91') ? `+${number}` : number;
    
    await updateWardenSession(wardenId, {
      status: 'connected',
      connected_phone: formattedNumber,
      last_connected: new Date(),
      qr_code_path: null
    });

    // Remove QR code file
    const qrPath = path.join(PUBLIC_DIR, `qr_warden_${wardenId}.png`);
    if (fs.existsSync(qrPath)) {
      fs.unlinkSync(qrPath);
    }
    
    sessions.get(wardenId).qrCode = null;
  });

  // Disconnected event
  client.on('disconnected', async (reason) => {
    console.log(`[WhatsApp] Warden ${wardenId} disconnected:`, reason);
    sessions.get(wardenId).isReady = false;
    
    await updateWardenSession(wardenId, {
      status: 'disconnected',
      qr_code_path: null
    });
  });

  // Auth failure event
  client.on('auth_failure', async (msg) => {
    console.error(`[WhatsApp] Warden ${wardenId} auth failure:`, msg);
    sessions.get(wardenId).isReady = false;
    
    await updateWardenSession(wardenId, {
      status: 'disconnected',
      qr_code_path: null
    });
  });

  // Initialize client
  try {
    await client.initialize();
  } catch (err) {
    console.error(`[WhatsApp] Failed to initialize warden ${wardenId}:`, err);
    await updateWardenSession(wardenId, {
      status: 'disconnected',
      qr_code_path: null
    });
    throw err;
  }

  return sessions.get(wardenId);
}

/**
 * Destroy a warden's WhatsApp session
 */
async function destroyWardenSession(wardenId) {
  console.log(`[WhatsApp] Destroying session for warden ${wardenId}`);
  
  const session = sessions.get(wardenId);
  if (session) {
    try {
      await session.client.destroy();
    } catch (err) {
      console.error(`[WhatsApp] Error destroying client for warden ${wardenId}:`, err);
    }
    sessions.delete(wardenId);
  }

  // Clean up files
  const sessionDir = path.join(SESSIONS_DIR, `warden_${wardenId}`);
  if (fs.existsSync(sessionDir)) {
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch (err) {
      console.error(`[WhatsApp] Error removing session dir for warden ${wardenId}:`, err);
    }
  }

  const qrPath = path.join(PUBLIC_DIR, `qr_warden_${wardenId}.png`);
  if (fs.existsSync(qrPath)) {
    try {
      fs.unlinkSync(qrPath);
    } catch (err) {
      console.error(`[WhatsApp] Error removing QR for warden ${wardenId}:`, err);
    }
  }

  // Update database
  await updateWardenSession(wardenId, {
    status: 'disconnected',
    connected_phone: null,
    last_connected: null,
    qr_code_path: null
  });
}

/**
 * Get session status for a warden
 */
async function getSessionStatus(wardenId) {
  const dbSession = await getWardenSession(wardenId);
  const memorySession = sessions.get(wardenId);
  
  return {
    ...(dbSession || {}),
    status: dbSession?.status || 'disconnected',
    isReady: memorySession?.isReady || false,
    qr_code_url: memorySession?.qrCode || dbSession?.qr_code_path
  };
}

/**
 * Format phone number
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    digits = '91' + digits;
  }
  if (digits.length >= 12 && digits.startsWith('91')) {
    return digits;
  }
  return null;
}

/**
 * Send WhatsApp message using warden's session
 */
async function sendWardenWhatsAppMessage(wardenId, phoneNumber, message) {
  const session = sessions.get(wardenId);
  
  if (!session || !session.isReady) {
    console.error(`[WhatsApp] Warden ${wardenId} session not ready`);
    return { success: false, error: 'WhatsApp service not connected' };
  }

  try {
    const formattedNumber = formatPhoneNumber(phoneNumber);
    if (!formattedNumber) {
      console.error(`[WhatsApp] Invalid phone number: ${phoneNumber}`);
      return { success: false, error: 'Invalid phone number' };
    }

    const chatId = `${formattedNumber}@c.us`;
    await session.client.sendMessage(chatId, message);
    console.log(`[WhatsApp] Message sent from warden ${wardenId} to ${formattedNumber}`);
    return { success: true };
  } catch (err) {
    console.error(`[WhatsApp] Error sending message from warden ${wardenId}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Send priority due reminders using warden's session
 */
async function sendPriorityDueReminders(wardenId) {
  console.log(`[WhatsApp] Sending priority reminders for warden ${wardenId}`);

  try {
    // Check if warden's session is connected
    const session = sessions.get(wardenId);
    if (!session || !session.isReady) {
      console.error(`[WhatsApp] Warden ${wardenId} session not ready`);
      return { success: false, error: 'WhatsApp service not connected. Please scan QR code first.' };
    }

    // Get warden's hostel
    const wardenResult = await db.query(
      'SELECT hostel_id FROM hostels WHERE warden_id = $1',
      [wardenId]
    );
    
    if (wardenResult.rows.length === 0) {
      return { success: false, error: 'No hostel assigned to this warden' };
    }
    
    const hostelId = wardenResult.rows[0].hostel_id;

    // Get overdue fees
    const studentsResult = await db.query(
      `SELECT 
        s.student_id,
        s.name, 
        s.phone,
        s.room_id,
        r.room_number, 
        s.payment_model, 
        SUM(f.amount + COALESCE(f.adjustment_amount, 0) - COALESCE(f.paid_amount, 0)) as total_due
      FROM fees f
      JOIN students s ON f.student_id = s.student_id
      LEFT JOIN rooms r ON s.room_id = r.room_id
      WHERE f.status != 'paid' 
        AND f.due_date < CURRENT_DATE
        AND f.hostel_id = $1
      GROUP BY s.student_id, s.name, s.phone, s.room_id, r.room_number, s.payment_model
      HAVING SUM(f.amount + COALESCE(f.adjustment_amount, 0) - COALESCE(f.paid_amount, 0)) > 0
      ORDER BY total_due DESC`,
      [hostelId]
    );

    let messagesSent = 0;
    let totalStudents = 0;
    let failedMessages = 0;

    for (const student of studentsResult.rows) {
      totalStudents++;
      
      const message = `Hello ${student.name}, your total hostel pending due amount is ₹${parseFloat(student.total_due).toLocaleString()}. Please clear your pending dues as soon as possible to avoid further issues. – Hostel Management`;
      
      const result = await sendWardenWhatsAppMessage(wardenId, student.phone, message);
      
      if (result.success) {
        messagesSent++;
      } else {
        failedMessages++;
      }
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log(`[WhatsApp] Priority reminders complete for warden ${wardenId}: ${messagesSent} sent, ${failedMessages} failed`);

    return {
      success: true,
      totalStudents,
      messagesSent,
      failedMessages
    };

  } catch (err) {
    console.error(`[WhatsApp] Error in priority reminders for warden ${wardenId}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Restore existing sessions on server start
 */
async function restoreSessions() {
  console.log('[WhatsApp] Restoring existing sessions...');
  
  try {
    const result = await db.query(
      'SELECT warden_id FROM warden_whatsapp_sessions WHERE status = $1 OR status = $2',
      ['connected', 'qr_pending']
    );

    for (const row of result.rows) {
      try {
        await initWardenSession(row.warden_id, false);
      } catch (err) {
        console.error(`[WhatsApp] Failed to restore session for warden ${row.warden_id}:`, err);
        await updateWardenSession(row.warden_id, { status: 'disconnected' });
      }
    }
    
    console.log('[WhatsApp] Session restoration complete');
  } catch (err) {
    console.error('[WhatsApp] Error restoring sessions:', err);
  }
}

module.exports = {
  initWardenSession,
  destroyWardenSession,
  getSessionStatus,
  sendWardenWhatsAppMessage,
  sendPriorityDueReminders,
  restoreSessions,
  formatPhoneNumber
};
