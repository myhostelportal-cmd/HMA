const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All routes here require 'owner' role
router.use(authenticateToken);
router.use(authorizeRoles('owner'));

// 1. Get List of Hostels for the Owner
router.get('/hostels', async (req, res) => {
  const ownerId = req.user.id;
  try {
    const result = await db.query(`
      SELECT 
        h.*,
        (
          SELECT COALESCE(SUM(
            (COALESCE((detail->>'ac')::int, 0) + COALESCE((detail->>'non_ac')::int, 0)) * 
            CASE 
              WHEN detail->>'type' = 'Single Seater' THEN 1
              WHEN detail->>'type' = 'Dual Seater' THEN 2
              WHEN detail->>'type' = 'Triple Seater' THEN 3
              WHEN detail->>'type' = 'Four Seater' THEN 4
              ELSE 0
            END
          ), 0)
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(h.room_details) = 'array' THEN h.room_details ELSE '[]'::jsonb END) as detail
        ) as calculated_capacity
      FROM hostels h 
      WHERE h.owner_id = $1
    `, [ownerId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching hostels:', err);
    res.status(500).json({ error: 'Server error fetching hostels.' });
  }
});

// 2. Get Dashboard Stats (Dynamic based on hostel_id query param)
router.get('/stats', async (req, res) => {
  const ownerId = req.user.id;
  const { hostel_id } = req.query;

  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Base query for hostels owned by this user
    let hostelSubquery = 'SELECT hostel_id FROM hostels WHERE owner_id = $1';
    let params = [ownerId];

    if (hostel_id && hostel_id !== 'all') {
      hostelSubquery += ' AND hostel_id = $2';
      params.push(hostel_id);
    }

    // --- Collection Summary (Total / All Time) ---
    
    // 1. Total Dues: Always use student.total_session_fees (Base fee only)
    let totalDuesQuery = `
      SELECT SUM(total_session_fees) as total 
      FROM students 
      WHERE hostel_id IN (${hostelSubquery})
    `;
    const totalDuesRes = await db.query(totalDuesQuery, params);

    // 2. Money Collected: SUM(amount) from payments table
    let collectedQuery = `
      SELECT SUM(amount) as total 
      FROM payments
      WHERE hostel_id IN (${hostelSubquery})
    `;
    const collectedRes = await db.query(collectedQuery, params);

    const totalDues = parseFloat(totalDuesRes.rows[0]?.total) || 0;
    const moneyCollected = parseFloat(collectedRes.rows[0]?.total) || 0;
    const moneyPending = totalDues - moneyCollected;

    // Consistency check log
    if (Math.abs(totalDues - (moneyCollected + moneyPending)) > 0.01) {
      console.error(`[FINANCE ERROR] Mismatch in calculations for Owner ${ownerId}. Dues: ${totalDues}, Collected: ${moneyCollected}, Pending: ${moneyPending}`);
    }

    // --- Summary ---
    const incomeRes = await db.query(`SELECT SUM(amount) as total FROM payments WHERE hostel_id IN (${hostelSubquery})`, params);
    const expenseRes = await db.query(`SELECT SUM(amount) as total FROM expenses WHERE hostel_id IN (${hostelSubquery})`, params);
    // Top Delinquent Accounts
    const delinquentQuery = `
      SELECT s.name, h.hostel_name, r.room_number as room_no, (s.total_session_fees - COALESCE(p.paid, 0)) as pending_amount
      FROM students s
      JOIN hostels h ON s.hostel_id = h.hostel_id
      LEFT JOIN (
        SELECT student_id, SUM(amount) as paid 
        FROM payments 
        GROUP BY student_id
      ) p ON s.student_id = p.student_id
      LEFT JOIN rooms r ON s.room_id = r.room_id
      WHERE s.hostel_id IN (${hostelSubquery}) AND (s.total_session_fees - COALESCE(p.paid, 0)) > 0
      ORDER BY pending_amount DESC
      LIMIT 5
    `;
    const delinquentRes = await db.query(delinquentQuery, params);

    // --- Occupancy Overview ---
    const occupancyQuery = `
      WITH hostel_stats AS (
        SELECT 
          h.hostel_id,
          COALESCE(SUM(
            (COALESCE((detail->>'ac')::int, 0) + COALESCE((detail->>'non_ac')::int, 0)) * 
            CASE 
              WHEN detail->>'type' = 'Single Seater' THEN 1
              WHEN detail->>'type' = 'Dual Seater' THEN 2
              WHEN detail->>'type' = 'Triple Seater' THEN 3
              WHEN detail->>'type' = 'Four Seater' THEN 4
              ELSE 0
            END
          ), 0) as capacity
        FROM hostels h
        LEFT JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(h.room_details) = 'array' THEN h.room_details ELSE '[]'::jsonb END) as detail ON true
        WHERE h.hostel_id IN (${hostelSubquery})
        GROUP BY h.hostel_id
      )
      SELECT 
        COALESCE(SUM(capacity), 0) as total_seats,
        (SELECT COUNT(*) FROM students WHERE hostel_id IN (${hostelSubquery}) AND status = 'active') as occupied_seats
      FROM hostel_stats
    `;
    const occupancyRes = await db.query(occupancyQuery, params);

    // --- Advance Collection (Security Deposits) ---
    const advanceQuery = `
      SELECT SUM(security_deposit) as total_collected,
             SUM(CASE WHEN status = 'active' THEN security_deposit ELSE 0 END) as active_advance
      FROM students
      WHERE hostel_id IN (${hostelSubquery})
    `;
    const advanceRes = await db.query(advanceQuery, params);

    const totalIncomeValue = parseFloat(incomeRes.rows[0]?.total) || 0;
    const totalExpenseValue = parseFloat(expenseRes.rows[0]?.total) || 0;
    const collected = moneyCollected;
    const remaining = moneyPending;
    const shouldCollect = totalDues;

    res.json({
      collectionProgress: {
        totalSeats: parseInt(occupancyRes.rows[0]?.total_seats) || 0,
        occupiedSeats: parseInt(occupancyRes.rows[0]?.occupied_seats) || 0,
        occupancyRatio: Math.round((parseInt(occupancyRes.rows[0]?.occupied_seats) / (parseInt(occupancyRes.rows[0]?.total_seats) || 1)) * 100) || 0,
        shouldCollect: shouldCollect,
        collected: collected,
        remaining: remaining
      },
      summary: {
        totalIncome: totalIncomeValue,
        totalExpense: totalExpenseValue,
        netProfit: totalIncomeValue - totalExpenseValue
      },
      pending: {
        total: moneyPending,
        studentCount: delinquentRes.rowCount || 0,
        delinquents: delinquentRes.rows || []
      },
      advance: {
        totalCollected: parseFloat(advanceRes.rows[0]?.total_collected) || 0,
        remainingAdvance: parseFloat(advanceRes.rows[0]?.active_advance) || 0
      }
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Server error fetching stats.', detail: err.message });
  }
});

// 3. Get Revenue Trend (Monthly)
router.get('/analytics/revenue', async (req, res) => {
  const ownerId = req.user.id;
  const { hostel_id } = req.query;

  try {
    let hostelSubquery = 'SELECT hostel_id FROM hostels WHERE owner_id = $1';
    let params = [ownerId];

    if (hostel_id && hostel_id !== 'all') {
      hostelSubquery += ' AND hostel_id = $2';
      params.push(hostel_id);
    }

    const query = `
      SELECT 
        TO_CHAR(actual_payment_date, 'Mon') as day,
        SUM(amount) as total
      FROM payments
      WHERE hostel_id IN (${hostelSubquery})
      GROUP BY TO_CHAR(actual_payment_date, 'Mon'), DATE_TRUNC('month', actual_payment_date)
      ORDER BY DATE_TRUNC('month', actual_payment_date)
    `;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching revenue trend:', err);
    res.status(500).json({ error: 'Server error fetching revenue trend.' });
  }
});

// 4. Get Warden Performance
router.get('/wardens', async (req, res) => {
  const ownerId = req.user.id;
  const { hostel_id } = req.query;

  try {
    let hostelSubquery = 'SELECT hostel_id FROM hostels WHERE owner_id = $1';
    let params = [ownerId];

    if (hostel_id && hostel_id !== 'all') {
      hostelSubquery += ' AND hostel_id = $2';
      params.push(hostel_id);
    }

    const query = `
      SELECT 
        w.name as warden_name,
        h.hostel_name,
        COALESCE(SUM(p.amount), 0) as collection,
        (
          SELECT COALESCE(SUM(total_session_fees), 0) 
          FROM students 
          WHERE hostel_id = h.hostel_id
        ) as total_fees,
        w.status,
        w.email,
        w.phone
      FROM wardens w
      JOIN hostels h ON w.warden_id = h.warden_id
      LEFT JOIN payments p ON h.hostel_id = p.hostel_id
      WHERE h.hostel_id IN (${hostelSubquery})
      GROUP BY w.warden_id, w.name, h.hostel_id, h.hostel_name, w.status, w.email, w.phone
    `;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching warden performance:', err);
    res.status(500).json({ error: 'Server error fetching wardens.' });
  }
});

// 5. Get Activity Feed
router.get('/activity', async (req, res) => {
  const ownerId = req.user.id;
  const { hostel_id } = req.query;

  try {
    let hostelSubquery = 'SELECT hostel_id FROM hostels WHERE owner_id = $1';
    let params = [ownerId];

    if (hostel_id && hostel_id !== 'all') {
      hostelSubquery += ' AND hostel_id = $2';
      params.push(hostel_id);
    }

    const simplifiedQuery = `
      SELECT 'payment' as type, p.amount, p.actual_payment_date as timestamp, s.name as student_name, h.hostel_name
      FROM payments p
      JOIN students s ON p.student_id = s.student_id
      JOIN hostels h ON p.hostel_id = h.hostel_id
      WHERE p.hostel_id IN (${hostelSubquery})
      ORDER BY p.actual_payment_date DESC
      LIMIT 10
    `;
    const result = await db.query(simplifiedQuery, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching activity feed:', err);
    res.status(500).json({ error: 'Server error fetching activity.' });
  }
});

// 6. Expenses Management
router.get('/expenses', async (req, res) => {
  const ownerId = req.user.id;
  const { hostel_id } = req.query;

  try {
    let hostelSubquery = 'SELECT hostel_id FROM hostels WHERE owner_id = $1';
    let params = [ownerId];

    if (hostel_id && hostel_id !== 'all') {
      hostelSubquery += ' AND hostel_id = $2';
      params.push(hostel_id);
    }

    const query = `
      SELECT e.*, h.hostel_name
      FROM expenses e
      JOIN hostels h ON e.hostel_id = h.hostel_id
      WHERE e.hostel_id IN (${hostelSubquery})
      ORDER BY e.date DESC
    `;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Server error fetching expenses.' });
  }
});

router.post('/expenses', async (req, res) => {
  const { hostel_id, category, amount, description, date } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO expenses (hostel_id, category, amount, description, date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [hostel_id, category, amount, description, date]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding expense:', err);
    res.status(500).json({ error: 'Server error adding expense.' });
  }
});

// 7. Finance Summary for P&L Page
router.get('/finance/summary', async (req, res) => {
  const ownerId = req.user.id;
  const { hostel_id } = req.query;

  try {
    let hostelSubquery = 'SELECT hostel_id FROM hostels WHERE owner_id = $1';
    let params = [ownerId];

    if (hostel_id && hostel_id !== 'all') {
      hostelSubquery += ' AND hostel_id = $2';
      params.push(hostel_id);
    }

    const incomeQuery = `SELECT SUM(amount) as total FROM payments WHERE hostel_id IN (${hostelSubquery})`;
    const expenseQuery = `SELECT SUM(amount) as total FROM expenses WHERE hostel_id IN (${hostelSubquery})`;
    const pendingQuery = `SELECT SUM(amount + COALESCE(adjustment_amount, 0) - COALESCE(paid_amount, 0)) as total FROM fees WHERE status != 'paid' AND hostel_id IN (${hostelSubquery})`;

    const [incomeRes, expenseRes, pendingRes] = await Promise.all([
      db.query(incomeQuery, params),
      db.query(expenseQuery, params),
      db.query(pendingQuery, params)
    ]);

    const income = parseFloat(incomeRes.rows[0]?.total) || 0;
    const expenses = parseFloat(expenseRes.rows[0]?.total) || 0;
    const pending = parseFloat(pendingRes.rows[0]?.total) || 0;

    // Get Split by Hostel
    const splitQuery = `
      SELECT h.hostel_name, COALESCE(SUM(p.amount), 0) as income
      FROM hostels h
      LEFT JOIN payments p ON h.hostel_id = p.hostel_id
      WHERE h.owner_id = $1
      ${hostel_id && hostel_id !== 'all' ? ' AND h.hostel_id = $2' : ''}
      GROUP BY h.hostel_id, h.hostel_name
    `;
    const splitRes = await db.query(splitQuery, params);

    res.json({
      income,
      expenses,
      pending,
      profit: income - expenses,
      split: splitRes.rows
    });
  } catch (err) {
    console.error('Error fetching finance summary:', err);
    res.status(500).json({ error: 'Server error fetching finance summary.' });
  }
});

// 8. Get Students for Owner (Filtered by Hostel)
router.get('/students', async (req, res) => {
  const ownerId = req.user.id;
  const { hostel_id, status } = req.query;

  try {
    let hostelSubquery = 'SELECT hostel_id FROM hostels WHERE owner_id = $1';
    let params = [ownerId];

    if (hostel_id && hostel_id !== 'all') {
      hostelSubquery += ' AND hostel_id = $2';
      params.push(hostel_id);
    }

    let studentQuery = `
      SELECT s.*, h.hostel_name, r.room_number, r.capacity as capacity, r.room_type as room_type_name
      FROM students s
      JOIN hostels h ON s.hostel_id = h.hostel_id
      LEFT JOIN rooms r ON s.room_id = r.room_id
      WHERE s.hostel_id IN (${hostelSubquery})
    `;

    if (status && status !== 'all') {
      studentQuery += ` AND s.status = $${params.length + 1}`;
      params.push(status);
    }

    studentQuery += ' ORDER BY h.hostel_name, r.room_number, s.name';

    const result = await db.query(studentQuery, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching owner students:', err);
    res.status(500).json({ error: 'Server error fetching students.' });
  }
});

// 9. Get Occupancy Details for All Hostels
router.get('/occupancy', async (req, res) => {
  const ownerId = req.user.id;
  try {
    // Get all hostels for this owner
    const hostelsRes = await db.query(`
      SELECT 
        h.hostel_id, 
        h.hostel_name, 
        h.total_rooms,
        (
          SELECT COALESCE(SUM(
            (COALESCE((detail->>'ac')::int, 0) + COALESCE((detail->>'non_ac')::int, 0)) * 
            CASE 
              WHEN detail->>'type' = 'Single Seater' THEN 1
              WHEN detail->>'type' = 'Dual Seater' THEN 2
              WHEN detail->>'type' = 'Triple Seater' THEN 3
              WHEN detail->>'type' = 'Four Seater' THEN 4
              ELSE 0
            END
          ), 0)
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(h.room_details) = 'array' THEN h.room_details ELSE '[]'::jsonb END) as detail
        ) as calculated_capacity,
        (SELECT COUNT(*) FROM students WHERE hostel_id = h.hostel_id AND status = 'active') as occupied_students
      FROM hostels h 
      WHERE h.owner_id = $1
    `, [ownerId]);

    const hostels = hostelsRes.rows;

    // For each hostel, get room-level details
    for (let hostel of hostels) {
      const roomsRes = await db.query(`
        SELECT 
          r.room_number as room_no,
          r.capacity,
          (SELECT COUNT(*) FROM students WHERE room_id = r.room_id AND status = 'active') as occupied
        FROM rooms r
        WHERE r.hostel_id = $1
        ORDER BY r.room_number
      `, [hostel.hostel_id]);
      hostel.rooms = roomsRes.rows;
    }

    res.json(hostels);
  } catch (err) {
    console.error('Error fetching owner occupancy:', err);
    res.status(500).json({ error: 'Server error fetching occupancy details.' });
  }
});

// 10. Generate Audit Reports
router.get('/reports', async (req, res) => {
  const ownerId = req.user.id;
  const { type, hostel_id, startDate, endDate, paymentMode } = req.query;

  try {
    let hostelSubquery = 'SELECT hostel_id FROM hostels WHERE owner_id = $1';
    let params = [ownerId];

    if (hostel_id && hostel_id !== 'all') {
      hostelSubquery += ' AND hostel_id = $2';
      params.push(hostel_id);
    }

    let query = '';
    if (type === 'revenue') {
      query = `
        SELECT 
          p.actual_payment_date as date,
          s.name as student_name,
          h.hostel_name,
          COALESCE(s.details->>'assigned_slot', r.room_number) as room_number,
          p.amount,
          p.payment_method as mode,
          p.transaction_id,
          p.receipt_id
        FROM payments p
        JOIN students s ON p.student_id = s.student_id
        JOIN hostels h ON p.hostel_id = h.hostel_id
        LEFT JOIN rooms r ON s.room_id = r.room_id
        WHERE p.hostel_id IN (${hostelSubquery})
        AND p.actual_payment_date >= $${params.length + 1}
        AND p.actual_payment_date <= $${params.length + 2}
      `;
      params.push(startDate, endDate);

      if (paymentMode && paymentMode !== 'all') {
        query += ` AND p.payment_method = $${params.length + 1}`;
        params.push(paymentMode);
      }
      query += ' ORDER BY p.actual_payment_date DESC';
    } else {
      query = `
        SELECT 
          e.date,
          e.description as detail,
          h.hostel_name,
          e.amount,
          e.category as mode,
          'Owner' as received_by
        FROM expenses e
        JOIN hostels h ON e.hostel_id = h.hostel_id
        WHERE e.hostel_id IN (${hostelSubquery})
        AND e.date >= $${params.length + 1}
        AND e.date <= $${params.length + 2}
        ORDER BY e.date DESC
      `;
      params.push(startDate, endDate);
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error generating owner report:', err);
    res.status(500).json({ error: 'Server error generating report.' });
  }
});

module.exports = router;
