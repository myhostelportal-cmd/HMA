const db = require('../config/db');
require('dotenv').config();

console.log('[Email] Checking SendGrid configuration:');
console.log('[Email] SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET');
console.log('[Email] FROM_EMAIL:', process.env.FROM_EMAIL ? 'SET' : 'NOT SET');

let sgMail = null;

async function initializeSendGrid() {
  if (process.env.SENDGRID_API_KEY) {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('[Email] SendGrid initialized successfully');
  } else {
    console.warn('[Email] SENDGRID_API_KEY not set, email functionality will be disabled');
  }
}

initializeSendGrid();

async function sendPriorityDueEmailReminders(wardenId) {
  console.log('[Email] Sending priority reminders for warden', wardenId);

  try {
    const wardenResult = await db.query(
      'SELECT h.hostel_id, h.hostel_name FROM wardens w LEFT JOIN hostels h ON w.warden_id = h.warden_id WHERE w.warden_id = $1',
      [wardenId]
    );

    if (wardenResult.rows.length === 0) {
      return { success: false, error: 'No hostel assigned to this warden' };
    }

    const hostelId = wardenResult.rows[0].hostel_id;
    const hostelName = wardenResult.rows[0].hostel_name;

    const studentsResult = await db.query(
      'SELECT s.student_id, s.name, s.details, s.phone, s.room_id, r.room_number, s.payment_model, SUM(f.amount + COALESCE(f.adjustment_amount, 0) - COALESCE(f.paid_amount, 0)) as total_due FROM fees f JOIN students s ON f.student_id = s.student_id LEFT JOIN rooms r ON s.room_id = r.room_id WHERE f.status != \'paid\' AND f.due_date < CURRENT_DATE AND f.hostel_id = $1 GROUP BY s.student_id, s.name, s.details, s.phone, s.room_id, r.room_number, s.payment_model HAVING SUM(f.amount + COALESCE(f.adjustment_amount, 0) - COALESCE(f.paid_amount, 0)) > 0 ORDER BY total_due DESC',
      [hostelId]
    );

    let emailsSent = 0;
    let totalStudents = 0;
    let failedEmails = 0;

    for (const student of studentsResult.rows) {
      totalStudents++;

      const studentEmail = student.details?.email;

      if (!studentEmail) {
        console.log('[Email] No email found for', student.name, ', skipping');
        failedEmails++;
        continue;
      }

      const message = 'Hello ' + student.name + ', your total hostel pending due amount is ₹' + parseFloat(student.total_due).toLocaleString() + '. Please clear your pending dues as soon as possible to avoid further issues. – Hostel Management';

      if (sgMail) {
        const msg = {
          to: studentEmail,
          from: process.env.FROM_EMAIL,
          subject: 'Urgent: Pending Dues Reminder - ' + hostelName,
          html: '<div style="font-family: \'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background-color: #f8fafc;"><div style="max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"><div style="background-color: #2563eb; padding: 32px; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">My Hostel Portal</h1></div><div style="padding: 40px; background-color: #ffffff;"><h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 20px; font-weight: 700;">Pending Dues Reminder</h2><p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hello <strong>' + student.name + '</strong>,</p><div style="background-color: #fef3c7; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #fbbf24;"><p style="margin: 0; font-size: 15px; color: #92400e;">Your total pending dues: <strong style="font-size: 20px; color: #b45309;">₹' + parseFloat(student.total_due).toLocaleString() + '</strong></p></div><p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">' + message + '</p><p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 0; padding-top: 24px; border-top: 1px solid #e2e8f0;">Please contact the warden or finance department for any queries regarding your dues.</p></div><div style="background-color: #f1f5f9; padding: 24px; text-align: center; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;"><p style="margin: 0; font-size: 13px; color: #94a3b8; font-weight: 500;">&copy; ' + new Date().getFullYear() + ' My Hostel Management System. All rights reserved.</p></div></div></div>',
        };

        try {
          console.log('[Email] Attempting to send to', studentEmail);
          await sgMail.send(msg);
          console.log('[Email] Reminder sent to', student.name, 'at', studentEmail);
          emailsSent++;
        } catch (mailErr) {
          console.error('[Email] Error sending to', student.name, ':', mailErr.response?.body || mailErr);
          failedEmails++;
        }
      } else {
        console.warn('[Email] SendGrid not configured, skipping email to', studentEmail);
        failedEmails++;
      }

      // Small delay to avoid rate limits
      await new Promise(function(resolve) { setTimeout(resolve, 100); });
    }

    console.log('[Email] Priority reminders complete for warden', wardenId, ':', emailsSent, 'sent,', failedEmails, 'failed');

    return {
      success: true,
      totalStudents: totalStudents,
      emailsSent: emailsSent,
      failedEmails: failedEmails
    };

  } catch (err) {
    console.error('[Email] Error in priority reminders for warden', wardenId, ':', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendPriorityDueEmailReminders: sendPriorityDueEmailReminders
};
