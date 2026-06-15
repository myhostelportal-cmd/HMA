const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

// Email Transporter (Gmail Setup, force IPv4 to fix ENETUNREACH errors!)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  family: 4, // Force IPv4
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Smart Login: Admin, Owner, Warden
router.post('/login', async (req, res) => {
  const { email, password, role: requestedRole } = req.body;
  console.log(`--- LOGIN ATTEMPT --- Email: ${email}, Requested Role: ${requestedRole || 'None (Smart Login)'}`);
  
  try {
    let user = null;
    let table = '';
    let finalRole = '';

    // If a role is explicitly provided (legacy support), we can still use it
    // But for "Smart Login", we search through all tables
    
    // 1. Check Admins
    if (!requestedRole || requestedRole === 'admin') {
      const adminResult = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
      if (adminResult.rows.length > 0) {
        user = adminResult.rows[0];
        table = 'admins';
        finalRole = 'admin';
      }
    }

    // 2. Check Owners (if not found in admins)
    if (!user && (!requestedRole || requestedRole === 'owner')) {
      const ownerResult = await db.query('SELECT * FROM owners WHERE email = $1', [email]);
      if (ownerResult.rows.length > 0) {
        user = ownerResult.rows[0];
        table = 'owners';
        finalRole = 'owner';
      }
    }

    // 3. Check Wardens (if not found in admins or owners)
    if (!user && (!requestedRole || requestedRole === 'warden')) {
      const wardenResult = await db.query('SELECT * FROM wardens WHERE email = $1', [email]);
      if (wardenResult.rows.length > 0) {
        user = wardenResult.rows[0];
        table = 'wardens';
        finalRole = 'warden';
      }
    }

    if (!user) {
      console.log(`--- LOGIN FAILED --- User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    console.log(`--- AUTH DEBUG --- Found in ${table}, Name: ${user.name}`);

    // Check if user is disabled
    if (user.status === 'disabled') {
      console.log(`--- LOGIN FAILED --- Account disabled for ${email}`);
      return res.status(403).json({ error: 'Your account has been disabled. Please contact system administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`--- BCRYPT CHECK --- Match: ${isMatch}`);
    
    if (!isMatch) {
      console.log(`--- LOGIN FAILED --- Password mismatch for ${email}`);
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const payload = { 
      id: user.admin_id || user.owner_id || user.warden_id, 
      role: finalRole, 
      name: user.name 
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1d' });

    console.log(`--- LOGIN SUCCESS --- User: ${user.name}, Role: ${finalRole}`);
    res.json({ token, user: payload });
  } catch (err) {
    console.error(`--- LOGIN ERROR ---`);
    console.error(`Message: ${err.message}`);
    console.error(`Stack: ${err.stack}`);
    if (err.code) console.error(`Code: ${err.code}`);
    res.status(500).json({ 
      error: 'Server error.', 
      details: err.message,
      code: err.code 
    });
  }
});

// Forgot Password Endpoint
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log(`--- FORGOT PASSWORD ATTEMPT --- Email: ${email}`);

  try {
    // Check in all tables
    let user = null;
    let table = '';
    
    const adminCheck = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
    if (adminCheck.rows.length > 0) {
      user = adminCheck.rows[0];
      table = 'admins';
    } else {
      const ownerCheck = await db.query('SELECT * FROM owners WHERE email = $1', [email]);
      if (ownerCheck.rows.length > 0) {
        user = ownerCheck.rows[0];
        table = 'owners';
      } else {
        const wardenCheck = await db.query('SELECT * FROM wardens WHERE email = $1', [email]);
        if (wardenCheck.rows.length > 0) {
          user = wardenCheck.rows[0];
          table = 'wardens';
        }
      }
    }

    if (!user) {
      console.log(`--- FORGOT PWD FAILED --- Email not registered: ${email}`);
      return res.status(404).json({ error: 'This email is not registered in the portal. Please contact admin.' });
    }

    // Generate Token and Expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Save to Database
    await db.query(`UPDATE ${table} SET reset_token = $1, reset_expiry = $2 WHERE email = $3`, [token, expiry, email]);

    // Send Email
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}&email=${email}`;
      
      const mailOptions = {
        from: `"My Hostel" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Request - My Hostel',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; bg-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <div style="background-color: #2563eb; padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">My Hostel Portal</h1>
              </div>
              <div style="padding: 40px; background-color: #ffffff;">
                <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 20px; font-weight: 700;">Password Reset Request</h2>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hello <strong>${user.name}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">You requested to reset your password. Please click the button below to continue. This link will expire in 15 minutes.</p>
                
                <div style="text-align: center; margin-bottom: 32px;">
                  <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; transition: background-color 0.2s;">Reset Password</a>
                </div>
                
                <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 24px;">If the button above doesn't work, copy and paste this link into your browser:</p>
                <p style="font-size: 12px; line-height: 1.6; color: #2563eb; word-break: break-all; margin-bottom: 32px;">${resetUrl}</p>
                
                <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 0; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                  If you didn't request this reset, you can safely ignore this email.
                </p>
              </div>
              <div style="background-color: #f1f5f9; padding: 24px; text-align: center; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
                <p style="margin: 0; font-size: 13px; color: #94a3b8; font-weight: 500;">&copy; ${new Date().getFullYear()} My Hostel Management System. All rights reserved.</p>
              </div>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`--- RESET EMAIL SENT --- User: ${user.name}, Email: ${email}`);
      res.json({ message: 'Password reset link sent to your email.' });
    } catch (mailErr) {
      console.error(`--- EMAIL SENDING FAILED ---`, mailErr);
      console.error(`--- EMAIL ERROR DETAILS ---`, {
        code: mailErr.code,
        message: mailErr.message,
        response: mailErr.response,
        command: mailErr.command
      });
      
      // FALLBACK: Log the link to the console so the admin/user can still recover during development
      const fallbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}&email=${email}`;
      console.log(`\n!!! FALLBACK RESET LINK (EMAIL FAILED) !!!\nURL: ${fallbackUrl}\n`);
      
      res.status(500).json({ 
        error: 'Email service is currently unavailable. Please contact admin with your email address for a manual reset link.',
        dev_note: 'Admin can find the reset link in the server logs.',
        error_details: mailErr.message // Optional: show error message to frontend for debugging
      });
    }

  } catch (err) {
    console.error(`--- FORGOT PWD ERROR ---`, err);
    res.status(500).json({ error: 'Server error. Could not send email.' });
  }
});

// Reset Password Endpoint
router.post('/reset-password', async (req, res) => {
  const { token, email, password } = req.body;
  console.log(`--- RESET PASSWORD ATTEMPT --- Email: ${email}`);

  try {
    // Check all tables for the token
    let table = '';
    let user = null;

    const adminCheck = await db.query('SELECT * FROM admins WHERE email = $1 AND reset_token = $2 AND reset_expiry > NOW()', [email, token]);
    if (adminCheck.rows.length > 0) {
      user = adminCheck.rows[0];
      table = 'admins';
    } else {
      const ownerCheck = await db.query('SELECT * FROM owners WHERE email = $1 AND reset_token = $2 AND reset_expiry > NOW()', [email, token]);
      if (ownerCheck.rows.length > 0) {
        user = ownerCheck.rows[0];
        table = 'owners';
      } else {
        const wardenCheck = await db.query('SELECT * FROM wardens WHERE email = $1 AND reset_token = $2 AND reset_expiry > NOW()', [email, token]);
        if (wardenCheck.rows.length > 0) {
          user = wardenCheck.rows[0];
          table = 'wardens';
        }
      }
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    // Hash New Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update Password and Clear Token
    await db.query(`UPDATE ${table} SET password = $1, reset_token = NULL, reset_expiry = NULL WHERE email = $2`, [hashedPassword, email]);

    console.log(`--- PASSWORD RESET SUCCESSFUL --- User: ${user.name}`);

    // Send Confirmation Email (Async - don't wait for it to respond to user)
    const sendConfirmationEmail = async () => {
      try {
        const mailOptions = {
          from: `"My Hostel" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Security Alert: Password Successfully Changed',
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; bg-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="background-color: #2563eb; padding: 32px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">My Hostel Portal</h1>
                </div>
                <div style="padding: 40px; background-color: #ffffff;">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; padding: 16px; background-color: #f0fdf4; border-radius: 50%; margin-bottom: 16px;">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                    <h2 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 700;">Password Changed Successfully</h2>
                  </div>
                  
                  <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hello <strong>${user.name}</strong>,</p>
                  
                  <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">This is a confirmation that the password for your My Hostel account has been successfully updated.</p>
                  
                  <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Details of Change:</p>
                    <p style="margin: 0; font-size: 15px; color: #1e293b;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p style="margin: 8px 0 0 0; font-size: 15px; color: #1e293b;"><strong>Time:</strong> ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                  </div>

                  <div style="text-align: center; margin-bottom: 32px;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; transition: background-color 0.2s;">Login to Portal</a>
                  </div>

                  <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 0; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                    If you did not perform this action, please contact our support team immediately or reset your password again to secure your account.
                  </p>
                </div>
                <div style="background-color: #f1f5f9; padding: 24px; text-align: center; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
                  <p style="margin: 0; font-size: 13px; color: #94a3b8; font-weight: 500;">&copy; ${new Date().getFullYear()} My Hostel Management System. All rights reserved.</p>
                </div>
              </div>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`--- CONFIRMATION EMAIL SENT --- User: ${user.name}, Email: ${email}`);
      } catch (mailErr) {
        console.error(`--- CONFIRMATION EMAIL FAILED ---`, mailErr);
      }
    };

    // Trigger the email without awaiting it to keep the response fast
    sendConfirmationEmail();

    res.json({ message: 'Password reset successful! You can now login with your new password.' });

  } catch (err) {
    console.error(`--- RESET PWD ERROR ---`, err);
    res.status(500).json({ error: 'Server error. Could not reset password.' });
  }
});

// Admin Registration (Initial setup or through other admin)
router.post('/register/admin', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const result = await db.query(
      'INSERT INTO admins (name, email, password) VALUES ($1, $2, $3) RETURNING admin_id, name, email',
      [name, email, hashedPassword]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
