const db = require('../config/db');

/**
 * Logs an administrative or system action into the database.
 * @param {string} userRole - The role of the user (e.g., 'admin', 'warden').
 * @param {number} userId - The ID of the user performing the action.
 * @param {string} action - Descriptive text of the action.
 * @param {string} module - The system module (e.g., 'hostel', 'owner', 'student').
 */
const logAction = async (userRole, userId, action, module) => {
  try {
    await db.query(
      'INSERT INTO activity_logs (user_role, user_id, action, module) VALUES ($1, $2, $3, $4)',
      [userRole, userId, action, module]
    );
  } catch (err) {
    console.error('Error recording activity log:', err);
  }
};

module.exports = { logAction };
