const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const cron = require('node-cron');

let whatsappClient = null;
let isReady = false;

const REMINDER_DAYS = [5, 4, 3, 2, 1, 0, -1, -2];

const authPath = path.join(__dirname, '../.wwebjs_auth');
const cachePath = path.join(__dirname, '../.wwebjs_cache');
const publicDir = path.join(__dirname, '../public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

function resetWhatsAppSession() {
  console.log('--- STARTING WHATSAPP SESSION RESET ---');
  try {
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log('--- AUTH CACHE (.wwebjs_auth) DELETED ---');
    }
    if (fs.existsSync(cachePath)) {
      fs.rmSync(cachePath, { recursive: true, force: true });
      console.log('--- SESSION CACHE (.wwebjs_cache) DELETED ---');
    }
    console.log('--- WHATSAPP SESSION RESET COMPLETE ---');
  } catch (err) {
    console.error('--- ERROR DURING SESSION RESET ---', err);
  }
}

function initWhatsApp(forceReset = false) {
  console.log('--- STARTING WHATSAPP INITIALIZATION ---');

  try {
    if (forceReset) {
      resetWhatsAppSession();
    }

    console.log('--- INITIALIZING WHATSAPP CLIENT (FRESH SESSION) ---');

    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    console.log('--- PUPPETEER EXECUTABLE PATH FROM ENV ---', chromePath);

    try {
      if (chromePath && fs.existsSync(chromePath)) {
        console.log('--- CHROME EXECUTABLE EXISTS AT PATH ---');
      } else if (chromePath) {
        console.warn('--- CHROME EXECUTABLE NOT FOUND AT PROVIDED PATH ---');
      }
    } catch (err) {
      console.error('--- ERROR CHECKING CHROME EXECUTABLE ---', err);
    }

    const puppeteerConfig = {
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    };

    if (chromePath) {
      puppeteerConfig.executablePath = chromePath;
    }

    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
      }),
      puppeteer: puppeteerConfig
    });

    console.log('--- PUPPETEER CONFIGURATION SET ---');

    whatsappClient.on('qr', async (qr) => {
      console.log('--- NEW WHATSAPP QR CODE GENERATED ---');
      try {
        const qrPath = path.join(publicDir, 'qr.png');
        
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
        
        console.log('--- WHATSAPP QR SAVED AS PNG: /public/qr.png ---');
      } catch (err) {
        console.error('--- ERROR GENERATING QR PNG ---', err);
      }
    });

    whatsappClient.on('authenticated', () => {
      console.log('--- WHATSAPP AUTHENTICATED SUCCESSFULLY ---');
    });

    whatsappClient.on('ready', () => {
      console.log('--- WHATSAPP CLIENT IS READY & CONNECTED ---');
      isReady = true;
      
      try {
        startCronJob();
      } catch (err) {
        console.error('--- ERROR STARTING CRON JOB ---', err);
      }
    });

    whatsappClient.on('auth_failure', (msg) => {
      console.error('--- WHATSAPP AUTHENTICATION FAILED ---', msg);
      isReady = false;
    });

    whatsappClient.on('disconnected', (reason) => {
      console.log('--- WHATSAPP DISCONNECTED --- Reason:', reason);
      isReady = false;
    });

    console.log('--- STARTING WHATSAPP CLIENT INITIALIZATION ---');
    whatsappClient.initialize().then(() => {
      console.log('--- WHATSAPP CLIENT INITIALIZE PROMISE RESOLVED ---');
    }).catch(err => {
      console.error('--- WHATSAPP INITIALIZATION ERROR ---', err);
      isReady = false;
    });

  } catch (err) {
    console.error('--- FATAL ERROR IN WHATSAPP INITIALIZATION ---', err);
    isReady = false;
  }
}

async function sendWhatsAppMessage(phoneNumber, message) {
  if (!whatsappClient || !isReady) {
    console.error('--- WHATSAPP CLIENT NOT READY ---');
    return false;
  }

  try {
    const formattedNumber = formatPhoneNumber(phoneNumber);
    if (!formattedNumber) {
      console.error('--- INVALID PHONE NUMBER ---', phoneNumber);
      return false;
    }

    const chatId = `${formattedNumber}@c.us`;
    await whatsappClient.sendMessage(chatId, message);
    console.log(`--- WHATSAPP MESSAGE SENT TO ${formattedNumber} ---`);
    return true;
  } catch (err) {
    console.error('--- ERROR SENDING WHATSAPP MESSAGE ---', err);
    return false;
  }
}

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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkAndSendReminders(hostelId = null) {
  console.log('--- STARTING FEE DUE REMINDERS ---', new Date().toISOString());

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let query = `
      SELECT 
        s.student_id,
        s.name,
        s.phone,
        s.details,
        f.fee_id,
        f.due_date,
        f.status,
        f.amount,
        f.month,
        f.installment_name,
        h.hostel_name,
        s.hostel_id
      FROM students s
      JOIN fees f ON s.student_id = f.student_id
      JOIN hostels h ON s.hostel_id = h.hostel_id
      WHERE f.status != 'paid'
    `;
    const params = [];

    if (hostelId) {
      query += ` AND s.hostel_id = $1`;
      params.push(hostelId);
    }

    query += ` ORDER BY s.student_id, f.due_date`;

    const studentsRes = await db.query(query, params);

    const studentsMap = new Map();

    for (const row of studentsRes.rows) {
      if (!studentsMap.has(row.student_id)) {
        studentsMap.set(row.student_id, {
          student_id: row.student_id,
          name: row.name,
          phone: row.phone,
          fees: []
        });
      }
      studentsMap.get(row.student_id).fees.push(row);
    }

    let messagesSent = 0;
    let totalProcessed = 0;
    let failedMessages = 0;

    for (const [studentId, student] of studentsMap) {
      totalProcessed++;

      for (const fee of student.fees) {
        const dueDate = new Date(fee.due_date);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (REMINDER_DAYS.includes(diffDays)) {
          const message = generateReminderMessage(student.name, diffDays, fee);
          console.log(`Sending reminder to ${student.name} (${student.phone}): ${message}`);

          const sent = await sendWhatsAppMessage(student.phone, message);
          if (sent) {
            messagesSent++;
            await delay(1500);
          } else {
            failedMessages++;
          }
        }
      }
    }

    console.log(`--- REMINDER JOB COMPLETED ---`);
    console.log(`Total students processed: ${totalProcessed}`);
    console.log(`Messages sent: ${messagesSent}`);
    console.log(`Failed messages: ${failedMessages}`);

    return {
      success: true,
      totalStudents: totalProcessed,
      messagesSent,
      failedMessages
    };

  } catch (err) {
    console.error('--- ERROR IN REMINDER JOB ---', err);
    return {
      success: false,
      error: err.message
    };
  }
}

function generateReminderMessage(studentName, days, fee) {
  const feeName = fee.month || fee.installment_name || 'fee';
  const amount = fee.amount ? `₹${parseFloat(fee.amount).toFixed(2)}` : '';

  if (days > 0) {
    return `Hello ${studentName},\n\nYour hostel ${feeName} payment ${amount ? `of ${amount} ` : ''}is due in ${days} ${days === 1 ? 'day' : 'days'}.\nPlease complete your payment before the due date.\n\n- Hostel Management`;
  } else if (days === 0) {
    return `Hello ${studentName},\n\nYour hostel ${feeName} payment ${amount ? `of ${amount} ` : ''}is due TODAY!\nPlease complete your payment as soon as possible.\n\n- Hostel Management`;
  } else {
    const overdueDays = Math.abs(days);
    return `Hello ${studentName},\n\nYour hostel ${feeName} payment ${amount ? `of ${amount} ` : ''}is ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} overdue!\nPlease complete your payment immediately to avoid any further action.\n\n- Hostel Management`;
  }
}

function startCronJob() {
  console.log('--- STARTING DAILY REMINDER CRON JOB (9:00 AM) ---');

  try {
    cron.schedule('0 9 * * *', async () => {
      console.log('--- CRON JOB TRIGGERED ---');
      await checkAndSendReminders();
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    console.log('--- CRON JOB SCHEDULED SUCCESSFULLY ---');
  } catch (err) {
    console.error('--- ERROR STARTING CRON JOB ---', err);
  }
}

async function sendPriorityDueReminders(hostelId = null) {
  console.log('--- STARTING PRIORITY DUE REMINDERS ---', new Date().toISOString());

  try {
    const db = require('../config/db');
    const today = new Date();
    
    let query = `
      SELECT 
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
    `;
    const params = [];

    if (hostelId) {
      query += ` AND f.hostel_id = $1`;
      params.push(hostelId);
    }

    query += ` GROUP BY s.student_id, s.name, s.phone, s.room_id, r.room_number, s.payment_model
               HAVING SUM(f.amount + COALESCE(f.adjustment_amount, 0) - COALESCE(f.paid_amount, 0)) > 0
               ORDER BY total_due DESC`;

    const studentsRes = await db.query(query, params);

    let messagesSent = 0;
    let totalStudents = 0;
    let failedMessages = 0;

    for (const student of studentsRes.rows) {
      totalStudents++;
      
      const message = `Hello ${student.name}, your total hostel pending due amount is ₹${parseFloat(student.total_due).toLocaleString()}. Please clear your pending dues as soon as possible to avoid further issues. – Hostel Management`;
      console.log(`Sending priority reminder to ${student.name} (${student.phone}): ${message}`);

      const sent = await sendWhatsAppMessage(student.phone, message);
      if (sent) {
        messagesSent++;
        await delay(1500);
      } else {
        failedMessages++;
      }
    }

    console.log(`--- PRIORITY DUE REMINDER JOB COMPLETED ---`);
    console.log(`Total students: ${totalStudents}`);
    console.log(`Messages sent: ${messagesSent}`);
    console.log(`Failed messages: ${failedMessages}`);

    return {
      success: true,
      totalStudents,
      messagesSent,
      failedMessages
    };

  } catch (err) {
    console.error('--- ERROR IN PRIORITY DUE REMINDERS ---', err);
    return {
      success: false,
      error: err.message
    };
  }
}

async function testReminders() {
  console.log('--- RUNNING TEST REMINDERS ---');
  await checkAndSendReminders();
}

module.exports = {
  initWhatsApp,
  sendWhatsAppMessage,
  checkAndSendReminders,
  testReminders,
  sendPriorityDueReminders,
  isReady: () => isReady
};
