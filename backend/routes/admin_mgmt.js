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
    await db.query(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Super Admin';
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_token TEXT;
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_expiry TIMESTAMP;
    `);
  } catch (err) {
    console.error('Error ensuring admin schema:', err);
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
    const adminResult = await db.query('SELECT * FROM admins WHERE admin_id = $1', [id]);
    if (adminResult.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });

    const admin = adminResult.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await db.query('UPDATE admins SET reset_token = $1, reset_expiry = $2 WHERE admin_id = $3', [token, expiry, id]);

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}&email=${admin.email}`;

    const mailOptions = {
      from: `"My Hostel" <${process.env.EMAIL_USER}>`,
      to: admin.email,
      subject: 'Password Reset Request - My Hostel',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">My Hostel Portal</h2>
          <p>Hello ${admin.name},</p>
          <p>An administrator has requested a password reset for your account. Please click the button below to continue. This link will expire in 15 minutes.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">If this was not requested, please contact your system administrator.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    await logAction(req.user.role, req.user.id, `Triggered password reset for admin: ${admin.name} (${admin.email})`, 'admin-mgmt');

    res.json({ message: 'Password reset link sent to the admin email.' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
