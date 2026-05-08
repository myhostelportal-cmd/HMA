const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAction } = require('../utils/logger');

const checkAttendanceSubmitted = async (hostelId, date) => {
  const result = await db.query(
    'SELECT * FROM attendance_submissions WHERE hostel_id = $1 AND date = $2',
    [hostelId, date]
  );
  return result.rows.length > 0;
};

router.get('/:hostelId', authenticateToken, authorizeRoles('warden', 'admin', 'owner'), async (req, res) => {
  try {
    const hostelId = parseInt(req.params.hostelId);
    const date = req.query.date || new Date().toISOString().split('T')[0];

    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(hostelId)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    const isSubmitted = await checkAttendanceSubmitted(hostelId, date);

    const result = await db.query(`
      SELECT 
        s.student_id,
        s.name,
        s.details,
        r.room_number,
        sa.attendance_id,
        sa.date,
        sa.status
      FROM students s
      LEFT JOIN rooms r ON s.room_id = r.room_id
      LEFT JOIN student_attendance sa 
        ON s.student_id = sa.student_id 
        AND sa.date = $2
      WHERE s.hostel_id = $1 
        AND s.status = 'active'
      ORDER BY r.room_number ASC, s.name ASC
    `, [hostelId, date]);

    const getSeatLetter = (index) => {
      if (!index) return 'A';
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      return letters[index - 1] || 'A';
    };

    const attendanceData = result.rows.map(row => {
      const slotIndex = row.details?.assigned_slot_index;
      const seatLetter = getSeatLetter(slotIndex);
      const roomWithSeat = row.room_number ? `${row.room_number}${seatLetter}` : 'N/A';
      
      return {
        student_id: row.student_id,
        name: row.name,
        room_number: roomWithSeat,
        attendance_id: row.attendance_id,
        date: row.date,
        status: row.status || 'absent'
      };
    });

    res.json({
      attendance: attendanceData,
      is_submitted: isSubmitted
    });

  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/mark', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  try {
    const { student_id, date, status } = req.body;

    if (!student_id || !date || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validStatuses = ['present', 'absent', 'leave'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const studentRes = await db.query('SELECT hostel_id FROM students WHERE student_id = $1', [student_id]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const hostelId = studentRes.rows[0].hostel_id;

    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(hostelId)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    const isSubmitted = await checkAttendanceSubmitted(hostelId, date);
    if (isSubmitted) {
      return res.status(403).json({ error: 'Attendance for this date has already been submitted and cannot be modified.' });
    }

    const existingRes = await db.query(
      'SELECT * FROM student_attendance WHERE student_id = $1 AND date = $2',
      [student_id, date]
    );

    let result;
    if (existingRes.rows.length > 0) {
      result = await db.query(
        'UPDATE student_attendance SET status = $3 WHERE student_id = $1 AND date = $2 RETURNING *',
        [student_id, date, status.toLowerCase()]
      );
    } else {
      result = await db.query(
        'INSERT INTO student_attendance (student_id, date, status) VALUES ($1, $2, $3) RETURNING *',
        [student_id, date, status.toLowerCase()]
      );
    }

    await logAction(
      req.user.role,
      req.user.id,
      `Marked student ${student_id} as ${status} for ${date}`,
      'attendance',
      student_id,
      null
    );

    res.json({
      success: true,
      attendance: result.rows[0]
    });

  } catch (err) {
    console.error('Error marking attendance:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/submit', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  try {
    const { hostel_id, date } = req.body;

    if (!hostel_id || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(parseInt(hostel_id))) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    const isSubmitted = await checkAttendanceSubmitted(parseInt(hostel_id), date);
    if (isSubmitted) {
      return res.status(400).json({ error: 'Attendance for this date has already been submitted.' });
    }

    await db.query(
      'INSERT INTO attendance_submissions (hostel_id, date, submitted_by, submitted_by_role) VALUES ($1, $2, $3, $4)',
      [parseInt(hostel_id), date, req.user.id, req.user.role]
    );

    await logAction(
      req.user.role,
      req.user.id,
      `Submitted attendance for ${date}`,
      'attendance',
      null,
      null
    );

    res.json({ success: true, message: 'Attendance submitted successfully!' });

  } catch (err) {
    console.error('Error submitting attendance:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/mark-all', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  try {
    const { hostel_id, date, status } = req.body;

    if (!hostel_id || !date || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validStatuses = ['present', 'absent', 'leave'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(parseInt(hostel_id))) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    const isSubmitted = await checkAttendanceSubmitted(parseInt(hostel_id), date);
    if (isSubmitted) {
      return res.status(403).json({ error: 'Attendance for this date has already been submitted and cannot be modified.' });
    }

    const studentsRes = await db.query(
      'SELECT student_id FROM students WHERE hostel_id = $1 AND status = \'active\'',
      [hostel_id]
    );

    const students = studentsRes.rows;

    for (const student of students) {
      const existingRes = await db.query(
        'SELECT * FROM student_attendance WHERE student_id = $1 AND date = $2',
        [student.student_id, date]
      );

      if (existingRes.rows.length > 0) {
        await db.query(
          'UPDATE student_attendance SET status = $3 WHERE student_id = $1 AND date = $2',
          [student.student_id, date, status.toLowerCase()]
        );
      } else {
        await db.query(
          'INSERT INTO student_attendance (student_id, date, status) VALUES ($1, $2, $3)',
          [student.student_id, date, status.toLowerCase()]
        );
      }
    }

    await logAction(
      req.user.role,
      req.user.id,
      `Marked all students as ${status} for ${date}`,
      'attendance',
      null,
      null
    );

    res.json({
      success: true,
      message: `Marked ${students.length} students as ${status}`
    });

  } catch (err) {
    console.error('Error marking all attendance:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/history/:studentId', authenticateToken, authorizeRoles('warden', 'admin', 'owner'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    const studentRes = await db.query('SELECT hostel_id FROM students WHERE student_id = $1', [studentId]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const hostelId = studentRes.rows[0].hostel_id;

    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(hostelId)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    const result = await db.query(`
      SELECT * FROM student_attendance 
      WHERE student_id = $1 
      ORDER BY date DESC 
      LIMIT 30
    `, [studentId]);

    res.json(result.rows);

  } catch (err) {
    console.error('Error fetching attendance history:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
