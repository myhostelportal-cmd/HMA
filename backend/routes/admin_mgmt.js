const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { logAction } = require('../utils/logger');

// Email Transporter (Gmail Setup)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Migration helper to ensure schema is correct
const ensureSchema = async () => {
  try {
    // Check if columns exist first, then add them if they don't
    const columnsCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'admins' 
      AND column_name IN ('status', 'role', 'phone', 'created_at', 'reset_token', 'reset_expiry')
    `);
    
    const existingColumns = columnsCheck.rows.map(r => r.column_name);
    
    if (!existingColumns.includes('status')) {
      await db.query("ALTER TABLE admins ADD COLUMN status VARCHAR(20) DEFAULT 'active'");
    }
    if (!existingColumns.includes('role')) {
      await db.query("ALTER TABLE admins ADD COLUMN role VARCHAR(50) DEFAULT 'Super Admin'");
    }
    if (!existingColumns.includes('phone')) {
      await db.query("ALTER TABLE admins ADD COLUMN phone VARCHAR(20)");
    }
    if (!existingColumns.includes('created_at')) {
      await db.query("ALTER TABLE admins ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    }
    if (!existingColumns.includes('reset_token')) {
      await db.query("ALTER TABLE admins ADD COLUMN reset_token TEXT");
    }
    if (!existingColumns.includes('reset_expiry')) {
      await db.query("ALTER TABLE admins ADD COLUMN reset_expiry TIMESTAMP");
    }
    
    console.log('--- ADMIN SCHEMA VERIFIED/UPDATED ---');
  } catch (err) {
    console.error('--- SCHEMA UPDATE FAILED ---');
    console.error(err);
  }
};

// Run schema ensure once on load
ensureSchema();

// GET all admins
router.get('/', authenticateToken, authorizeRoles('admin', 'owner'), async (req, res) => {
  try {
    const result = await db.query('SELECT admin_id, name, email, role, status, phone, created_at FROM admins ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching admins:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST add new admin
router.post('/', authenticateToken, authorizeRoles('admin', 'owner'), async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  try {
    // Check if email already exists
    const checkEmail = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.query(
      'INSERT INTO admins (name, email, password, role, phone, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING admin_id, name, email, role, status',
      [name, email, hashedPassword, role || 'Super Admin', phone, 'active']
    );

    await logAction(req.user.role, req.user.id, `Created admin: ${name} (${email})`, 'admin-mgmt');
    
    // Send Welcome Email
    try {
      const mailOptions = {
        from: `"My Hostel" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Welcome to My Hostel - Admin Account Created',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2563eb;">Welcome to My Hostel Portal</h2>
            <p>Hello ${name},</p>
            <p>An administrative account has been created for you on the My Hostel Management System.</p>
            <p><strong>Your Account Details:</strong></p>
            <ul>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Role:</strong> ${role || 'Super Admin'}</li>
            </ul>
            <p>You can now log in using the credentials provided by your system administrator.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Login to Portal</a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">If you have any questions, please contact your Super Admin.</p>
          </div>
        `,
      };
      await transporter.sendMail(mailOptions);
      console.log(`--- WELCOME EMAIL SENT --- User: ${name}, Email: ${email}`);
    } catch (mailErr) {
      console.error('--- WELCOME EMAIL FAILED ---', mailErr);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding admin:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT edit admin
router.put('/:id', authenticateToken, authorizeRoles('admin', 'owner'), async (req, res) => {
  const { id } = req.params;
  const { name, email, role, status, phone } = req.body;
  try {
    const result = await db.query(
      'UPDATE admins SET name = $1, email = $2, role = $3, status = $4, phone = $5 WHERE admin_id = $6 RETURNING *',
      [name, email, role || 'Super Admin', status, phone, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });

    await logAction(req.user.role, req.user.id, `Edited admin: ${name} (${result.rows[0].email})`, 'admin-mgmt');

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating admin:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH disable admin
router.patch('/:id/disable', authenticateToken, authorizeRoles('admin', 'owner'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE admins SET status = \'disabled\' WHERE admin_id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });

    await logAction(req.user.role, req.user.id, `Disabled admin: ${result.rows[0].name} (${result.rows[0].email})`, 'admin-mgmt');

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error disabling admin:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST trigger password reset
router.post('/:id/reset-password', authenticateToken, authorizeRoles('admin', 'owner'), async (req, res) => {
  const { id } = req.params;
  try {
    console.log(`--- RESET ATTEMPT FOR ADMIN ID: ${id} ---`);
    console.log(`--- AUTH USER INFO: ID=${req.user.id}, Role=${req.user.role} ---`);
    
    // Check if the table has the required columns
    try {
      console.log('--- CHECKING SCHEMA ---');
      const schemaCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'admins' 
        AND column_name IN ('reset_token', 'reset_expiry')
      `);
      console.log('--- SCHEMA CHECK RESULT --- Found columns:', schemaCheck.rows.map(r => r.column_name));
      
      if (schemaCheck.rows.length < 2) {
        console.log('--- SCHEMA FIX TRIGGERED --- Adding missing columns');
        await ensureSchema();
      }
    } catch (schemaErr) {
      console.error('--- SCHEMA CHECK FAILED ---', schemaErr);
    }

    console.log('--- FETCHING ADMIN DETAILS ---');
    const adminResult = await db.query('SELECT * FROM admins WHERE admin_id = $1', [id]);
    
    if (adminResult.rows.length === 0) {
      console.log(`--- ADMIN NOT FOUND: ID=${id} ---`);
      return res.status(404).json({ error: 'Admin not found' });
    }

    const admin = adminResult.rows[0];
    console.log(`--- ADMIN FOUND: Name=${admin.name}, Email=${admin.email} ---`);
    
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    console.log(`--- UPDATING ADMIN WITH TOKEN --- Token=${token.substring(0, 10)}...`);
    try {
      await db.query('UPDATE admins SET reset_token = $1, reset_expiry = $2 WHERE admin_id = $3', [token, expiry, id]);
      console.log(`--- DATABASE UPDATE SUCCESS ---`);
    } catch (dbErr) {
      console.error(`--- DATABASE UPDATE FAILED ---`, dbErr);
      throw new Error(`Database error: ${dbErr.message}`);
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}&email=${admin.email}`;

    const mailOptions = {
      from: `"My Hostel" <${process.env.EMAIL_USER}>`,
      to: admin.email,
      subject: 'Action Required: Password Reset for Your Admin Account',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #2563eb; padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">My Hostel Portal</h1>
            </div>
            <div style="padding: 40px; background-color: #ffffff;">
              <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 20px; font-weight: 700;">Admin Password Reset</h2>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hello <strong>${admin.name}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">A password reset has been triggered for your administrative account. Please use the secure link below to set a new password. For your security, this link will expire in <strong>15 minutes</strong>.</p>
              
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; transition: background-color 0.2s; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Reset My Password</a>
              </div>
              
              <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin-bottom: 32px;">
                <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 0;"><strong>Security Tip:</strong> If you did not expect this reset, please contact the main system administrator immediately to secure your account.</p>
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 8px;">If the button doesn't work, copy and paste this link:</p>
              <p style="font-size: 12px; line-height: 1.6; color: #2563eb; word-break: break-all; margin-bottom: 32px; background: #f1f5f9; padding: 12px; border-radius: 8px;">${resetUrl}</p>
            </div>
            <div style="background-color: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 13px; color: #94a3b8; font-weight: 500;">&copy; ${new Date().getFullYear()} My Hostel Management System. All rights reserved.</p>
            </div>
          </div>
        </div>
      `
    };

    console.log(`--- SENDING EMAIL TO: ${admin.email} ---`);
    try {
      await transporter.sendMail(mailOptions);
      console.log(`--- EMAIL SENT SUCCESSFULLY ---`);
      
      console.log(`--- LOGGING ACTION ---`);
      await logAction(req.user.role, req.user.id, `Triggered password reset for admin: ${admin.name} (${admin.email})`, 'admin-mgmt');
      
      res.json({ message: 'Password reset link sent to the admin email.' });
    } catch (mailErr) {
      console.error('--- ADMIN RESET EMAIL FAILED ---', mailErr);
      
      // Still log the fallback link to console
      console.log(`\n!!! FALLBACK RESET LINK (EMAIL FAILED) !!!\nURL: ${resetUrl}\n`);
      
      res.status(500).json({ 
        error: 'Email service error: ' + (mailErr.message || 'Unknown error'),
        dev_note: 'The token was saved to the database. Check server logs for the fallback link.' 
      });
    }
  } catch (err) {
    console.error('--- GLOBAL RESET PASSWORD ERROR ---');
    console.error(`Message: ${err.message}`);
    console.error(`Stack: ${err.stack}`);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
