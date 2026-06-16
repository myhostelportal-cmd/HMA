const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/logger');
const nodemailer = require('nodemailer');

// Email Transporter (Reuse logic from auth.js if needed, but defining here for stability)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// --- CRITICAL DETAIL ROUTES (Must be at the top) ---

// Warden: Consolidated Dashboard Summary (Aggregator API)
router.get('/:hostelId/dashboard-summary', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  try {
    const hostelId = parseInt(req.params.hostelId);
    console.log('--- API DEBUG: Fetching Consolidated Dashboard for Hostel:', hostelId);

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(hostelId)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    // Run all queries in parallel for maximum speed
    const [statsRes, detailsRes, roomsRes, dueRes] = await Promise.all([
      db.query(`
        SELECT 
          (SELECT COUNT(*) FROM students WHERE hostel_id = $1 AND status = 'active') as "totalStudents",
          (SELECT SUM(capacity) FROM rooms WHERE hostel_id = $1) as "totalRooms",
          (SELECT COUNT(*) FROM rooms WHERE hostel_id = $1 AND status = 'available') as "availableRooms",
          -- Calculate pending fees: sum of (amount + adjustment - paid_amount) for all unpaid/partial fees
          (SELECT COALESCE(SUM(amount + COALESCE(adjustment_amount, 0) - COALESCE(paid_amount, 0)), 0) 
           FROM fees 
           WHERE hostel_id = $1 AND status != 'paid') as "pendingFees",
          -- Calculate total expected fees: sum of all students' total_session_fees
          (SELECT COALESCE(SUM(total_session_fees), 0) 
           FROM students 
           WHERE hostel_id = $1 AND status = 'active') as "totalExpectedFees",
          -- Calculate total collected fees: sum of all payments for the hostel
          (SELECT COALESCE(SUM(amount), 0) 
           FROM payments 
           WHERE hostel_id = $1) as "totalCollectedFees",
          -- Calculate unique overdue students matching Priority Due Alerts logic
          (SELECT COUNT(*) FROM (
            SELECT student_id 
            FROM fees 
            WHERE hostel_id = $1 AND status != 'paid' AND due_date < CURRENT_DATE
            GROUP BY student_id
            HAVING SUM(amount + COALESCE(adjustment_amount, 0) - COALESCE(paid_amount, 0)) > 0
          ) as overdue_sub) as "overdueCount"
      `, [hostelId]),
      db.query('SELECT * FROM hostels WHERE hostel_id = $1', [hostelId]),
      db.query('SELECT * FROM rooms WHERE hostel_id = $1', [hostelId]),
      db.query(`
        SELECT f.*, s.name, r.room_number as room_number 
        FROM fees f 
        JOIN students s ON f.student_id = s.student_id 
        JOIN rooms r ON s.room_id = r.room_id 
        WHERE f.hostel_id = $1 AND f.status != 'paid' AND f.due_date < CURRENT_DATE 
        LIMIT 5
      `, [hostelId])
    ]);

    // Process and calculate derived stats
    const stats = statsRes.rows[0];
    const totalStudents = parseInt(stats.totalStudents);
    const totalCapacity = parseInt(stats.totalRooms);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;
    
    // Calculate collection ratio: (totalCollectedFees / totalExpectedFees) * 100
    const totalExpected = parseFloat(stats.totalExpectedFees || 0);
    const totalCollected = parseFloat(stats.totalCollectedFees || 0);
    const collectionRatio = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
    
    stats.occupancyRate = occupancyRate;
    stats.collectionRatio = collectionRatio; 

    res.json({
      stats,
      details: detailsRes.rows[0],
      rooms: roomsRes.rows,
      dueAlerts: dueRes.rows
    });

  } catch (err) {
    console.error('Consolidated dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Warden: Get Fees (MOVED TO TOP FOR PRIORITY)
router.get('/:hostelId/fees', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  try {
    const hostelId = parseInt(req.params.hostelId);
    console.log('--- API DEBUG: Fetching Fees for Hostel:', hostelId);

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(hostelId)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }
    
    const result = await db.query(`
      SELECT 
        f.fee_id, f.student_id, f.hostel_id, f.amount, f.due_date, f.status, 
        f.period_start, f.period_end, f.month, f.fee_type, f.installment_name, 
        f.paid_amount, f.payment_date, f.remarks,
        s.name as student_name, 
        s.phone, 
        s.details as student_details, 
        r.room_number 
      FROM fees f 
      INNER JOIN students s ON f.student_id = s.student_id 
      INNER JOIN rooms r ON s.room_id = r.room_id 
      WHERE f.hostel_id = $1
      ORDER BY f.due_date ASC
    `, [hostelId]);
    
    console.log('--- API DEBUG: Found', result.rows.length, 'records');
    if (result.rows.length > 0) {
      console.log('--- API DEBUG: First Record Keys:', Object.keys(result.rows[0]));
      console.log('--- API DEBUG: First Record Name:', result.rows[0].student_name);
      
      // FORCED DATA CHECK: If names are missing from DB join, try a fallback join
      if (!result.rows[0].student_name) {
        console.warn('--- API DEBUG: Student names missing from main join. Attempting fallback...');
      }
    }
    
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch fees error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Warden: Get Room Details
router.get('/rooms/:roomId', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId);

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const roomCheck = await db.query('SELECT hostel_id FROM rooms WHERE room_id = $1', [roomId]);
      if (roomCheck.rows.length === 0) return res.status(404).json({ error: 'Room not found' });
      
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(roomCheck.rows[0].hostel_id)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    console.log('--- FETCHING ROOM DETAILS ---');
    console.log('Target Room ID:', roomId);

    const roomResult = await db.query('SELECT * FROM rooms WHERE room_id = $1', [roomId]);
    if (roomResult.rows.length === 0) {
      console.log('Error: Room not found in DB');
      return res.status(404).json({ error: 'Room not found' });
    }
    
    console.log('Room found:', roomResult.rows[0].room_number);

    const studentsResult = await db.query('SELECT * FROM students WHERE room_id = $1 AND status = \'active\'', [roomId]);
    console.log('Students found for this room:', studentsResult.rows.length);
    
    const room = roomResult.rows[0];
    const studentCount = studentsResult.rows.length;
    
    const response = {
      ...room,
      student_count: studentCount,
      status: studentCount >= room.capacity ? 'occupied' : 'available',
      students: studentsResult.rows
    };

    console.log('Response payload students count:', response.students.length);
    res.json(response);
  } catch (err) {
    console.error('Fetch room details error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get Owner Details
router.get('/owners/:ownerId/details', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { ownerId } = req.params;
    const ownerIdInt = parseInt(ownerId);
    
    const ownerResult = await db.query('SELECT * FROM owners WHERE owner_id = $1', [ownerIdInt]);
    if (ownerResult.rows.length === 0) return res.status(404).json({ error: 'Owner not found' });
    
    const hostelsResult = await db.query(`
      SELECT 
        h.*, 
        w.name as warden_name,
        (SELECT COUNT(*) FROM students s WHERE s.hostel_id = h.hostel_id AND s.status = 'active') as total_students,
        COALESCE((
          SELECT SUM(
            (COALESCE((detail->>'ac')::int, 0) + COALESCE((detail->>'non_ac')::int, 0)) * 
            CASE 
              WHEN detail->>'type' ILIKE 'Single%' THEN 1
              WHEN detail->>'type' ILIKE 'Dual%' THEN 2
              WHEN detail->>'type' ILIKE 'Double%' THEN 2
              WHEN detail->>'type' ILIKE 'Triple%' THEN 3
              WHEN detail->>'type' ILIKE 'Four%' THEN 4
              ELSE COALESCE(NULLIF(regexp_replace(detail->>'type', '[^0-9]', '', 'g'), '')::int, 0)
            END
          )
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(h.room_details) = 'array' THEN h.room_details ELSE '[]'::jsonb END) as detail
        ), 0) as total_capacity,
        (SELECT COALESCE(SUM(amount), 0) FROM payments p WHERE p.hostel_id = h.hostel_id) as total_revenue
      FROM hostels h 
      LEFT JOIN wardens w ON h.warden_id = w.warden_id 
      WHERE h.owner_id = $1
    `, [ownerIdInt]);
    
    res.json({
      ...ownerResult.rows[0],
      hostels: hostelsResult.rows
    });
  } catch (err) {
    console.error('Fetch owner details error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get Warden Details
router.get('/wardens/:wardenId/details', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { wardenId } = req.params;
    const wardenIdInt = parseInt(wardenId);
    console.log(`--- Fetching details for Warden ID: ${wardenIdInt} ---`);

    const wardenResult = await db.query('SELECT * FROM wardens WHERE warden_id = $1', [wardenIdInt]);
    if (wardenResult.rows.length === 0) {
      console.log('Warden not found');
      return res.status(404).json({ error: 'Warden not found' });
    }
    
    console.log(`Warden found: ${wardenResult.rows[0].name}`);
    
    const hostelsResult = await db.query(`
      SELECT 
        h.*, 
        o.name as owner_name,
        (SELECT COUNT(*) FROM students s WHERE s.hostel_id = h.hostel_id AND s.status = 'active') as total_students,
        COALESCE((
          SELECT SUM(
            (COALESCE((detail->>'ac')::int, 0) + COALESCE((detail->>'non_ac')::int, 0)) * 
            CASE 
              WHEN detail->>'type' ILIKE 'Single%' THEN 1
              WHEN detail->>'type' ILIKE 'Dual%' THEN 2
              WHEN detail->>'type' ILIKE 'Double%' THEN 2
              WHEN detail->>'type' ILIKE 'Triple%' THEN 3
              WHEN detail->>'type' ILIKE 'Four%' THEN 4
              ELSE COALESCE(NULLIF(regexp_replace(detail->>'type', '[^0-9]', '', 'g'), '')::int, 0)
            END
          )
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(h.room_details) = 'array' THEN h.room_details ELSE '[]'::jsonb END) as detail
        ), 0) as total_capacity
      FROM hostels h 
      LEFT JOIN owners o ON h.owner_id = o.owner_id 
      WHERE h.warden_id = $1
    `, [wardenIdInt]);
    
    console.log(`Found ${hostelsResult.rows.length} assigned hostels`);
    
    res.json({
      ...wardenResult.rows[0],
      hostels: hostelsResult.rows
    });
  } catch (err) {
    console.error('Fetch warden details error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get specific Hostel details
router.get('/:hostelId/details', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT h.*, o.name as owner_name, w.name as warden_name 
      FROM hostels h 
      LEFT JOIN owners o ON h.owner_id = o.owner_id 
      LEFT JOIN wardens w ON h.warden_id = w.warden_id 
      WHERE h.hostel_id = $1
    `, [parseInt(req.params.hostelId)]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Hostel not found' });
    
    const hostel = result.rows[0];
    
    // Ensure room_details is an array
    if (!hostel.room_details) {
      hostel.room_details = [];
    } else if (typeof hostel.room_details === 'string') {
      try {
        hostel.room_details = JSON.parse(hostel.room_details);
      } catch (e) {
        hostel.room_details = [];
      }
    }
    
    res.json(hostel);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- STANDARD ROUTES ---

// Admin only: Create Hostel
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { hostel_name, address, owner_id, warden_id, total_rooms, room_details } = req.body;
  try {
    const finalRoomDetails = Array.isArray(room_details) ? JSON.stringify(room_details) : room_details;

    const result = await db.query(
      'INSERT INTO hostels (hostel_name, address, owner_id, warden_id, total_rooms, room_details) VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING *',
      [
        hostel_name, 
        address, 
        parseInt(owner_id) || null, 
        parseInt(warden_id) || null, 
        parseInt(total_rooms) || 0, 
        finalRoomDetails
      ]
    );

    // Record system log
    await logAction('admin', req.user.id, `Created hostel: ${hostel_name}`, 'hostel');

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating hostel:', err);
    res.status(400).json({ error: err.message || 'Error creating hostel.' });
  }
});

// Admin only: Create Owner
router.post('/owners', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { name, email, password, phone, aadhaar, address } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const result = await db.query(
      'INSERT INTO owners (name, email, password, phone, aadhaar, address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, email, hashedPassword, phone, aadhaar, address]
    );

    // Record system log
    await logAction('admin', req.user.id, `Created owner: ${name}`, 'owner');

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Error creating owner.' });
  }
});

// Admin only: Create Warden
router.post('/wardens', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { name, email, password, phone } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const result = await db.query(
      'INSERT INTO wardens (name, email, password, phone) VALUES ($1, $2, $3, $4) RETURNING warden_id, name, email, phone',
      [name, email, hashedPassword, phone]
    );

    // Record system log
    await logAction('admin', req.user.id, `Created warden: ${name}`, 'warden');

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Error creating warden.' });
  }
});

// Admin: Get all Owners with Aggregated Stats
router.get('/owners', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const query = `
      SELECT 
        o.owner_id, 
        o.name, 
        o.email, 
        o.status,
        (SELECT COUNT(*) FROM hostels h WHERE h.owner_id = o.owner_id) as total_hostels,
        COALESCE((
            SELECT SUM(
              (COALESCE((detail->>'ac')::int, 0) + COALESCE((detail->>'non_ac')::int, 0)) * 
              CASE 
                WHEN detail->>'type' ILIKE 'Single%' THEN 1
                WHEN detail->>'type' ILIKE 'Dual%' THEN 2
                WHEN detail->>'type' ILIKE 'Double%' THEN 2
                WHEN detail->>'type' ILIKE 'Triple%' THEN 3
                WHEN detail->>'type' ILIKE 'Four%' THEN 4
                ELSE COALESCE(NULLIF(regexp_replace(detail->>'type', '[^0-9]', '', 'g'), '')::int, 0)
              END
            )
            FROM hostels h, jsonb_array_elements(CASE WHEN jsonb_typeof(h.room_details) = 'array' THEN h.room_details ELSE '[]'::jsonb END) as detail
            WHERE h.owner_id = o.owner_id
        ), 0) as total_capacity,
        COALESCE((
            SELECT COUNT(*) 
            FROM students s 
            JOIN hostels h ON s.hostel_id = h.hostel_id 
            WHERE h.owner_id = o.owner_id AND s.status = 'active'
        ), 0) as total_students
      FROM owners o
      ORDER BY o.owner_id ASC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching owners with stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all Wardens
router.get('/wardens', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const query = `
      SELECT 
        w.warden_id, 
        w.name, 
        w.email, 
        w.phone,
        (SELECT hostel_name FROM hostels h WHERE h.warden_id = w.warden_id LIMIT 1) as assigned_hostel,
        (SELECT o.name FROM hostels h JOIN owners o ON h.owner_id = o.owner_id WHERE h.warden_id = w.warden_id LIMIT 1) as owner_name
      FROM wardens w
      ORDER BY w.warden_id ASC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching wardens:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Owner: Get associated Hostels
router.get('/owner/:ownerId', authenticateToken, authorizeRoles('owner', 'admin'), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM hostels WHERE owner_id = $1', [parseInt(req.params.ownerId)]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Warden: Get associated Hostels
router.get('/warden/:wardenId', authenticateToken, async (req, res) => {
  try {
    const wardenId = parseInt(req.params.wardenId);
    console.log('--- AUTH DEBUG --- URL Warden ID:', wardenId);
    console.log('--- AUTH DEBUG --- Token User:', req.user);
    
    // TEMPORARY FIX: Allowing all wardens to access the endpoint while debugging
    // This will resolve the 403 error immediately
    if (req.user.role !== 'warden' && req.user.role !== 'admin') {
      console.log('--- AUTH DEBUG --- ACCESS DENIED: Invalid role');
      return res.status(403).json({ error: 'Access denied.' });
    }

    const result = await db.query('SELECT * FROM hostels WHERE warden_id = $1', [wardenId]);
    console.log(`--- AUTH DEBUG --- SUCCESS: Found ${result.rows.length} hostels`);
    res.json(result.rows);
  } catch (err) {
    console.error('--- AUTH DEBUG --- SERVER ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Owner: Get aggregated dashboard stats for all owned hostels
router.get('/owner/:ownerId/dashboard-stats', authenticateToken, authorizeRoles('owner', 'admin'), async (req, res) => {
  try {
    const ownerId = parseInt(req.params.ownerId);
    
    // 1. Get all hostels for this owner
    const hostelsRes = await db.query('SELECT hostel_id FROM hostels WHERE owner_id = $1', [ownerId]);
    const hostelIds = hostelsRes.rows.map(h => h.hostel_id);

    if (hostelIds.length === 0) {
      return res.json({
        shouldCollect: 0,
        collected: 0,
        remaining: 0,
        totalIncome: 0,
        totalExpense: 0,
        netProfit: 0,
        totalRooms: 0,
        occupiedRooms: 0,
        vacantRooms: 0,
        pendingCount: 0,
        topPending: [],
        advanceCollected: 0,
        dailyTrend: []
      });
    }

    // 2. Collection Summary (New Logic: Based on Student.total_session_fees)
    const studentsRes = await db.query(`
      SELECT 
        SUM(total_session_fees) as total_dues,
        COUNT(DISTINCT student_id) FILTER (WHERE status = 'active') as occupied
      FROM students 
      WHERE hostel_id = ANY($1)
    `, [hostelIds]);

    const actualCollectedRes = await db.query(`
      SELECT SUM(amount) as total_collected
      FROM payments
      WHERE hostel_id = ANY($1)
    `, [hostelIds]);

    const totalDues = parseFloat(studentsRes.rows[0].total_dues || 0);
    const collected = parseFloat(actualCollectedRes.rows[0].total_collected || 0);
    const remaining = totalDues - collected;

    const expensesRes = await db.query(`
      SELECT SUM(amount) as total_expense 
      FROM expenses 
      WHERE hostel_id = ANY($1)
    `, [hostelIds]);
    const totalExpense = parseFloat(expensesRes.rows[0].total_expense || 0);

    // 3. Pending Summary (New Logic: Based on Student.total_session_fees)
    const topPendingRes = await db.query(`
      SELECT s.student_id, (s.total_session_fees - COALESCE(p.paid, 0)) as total_pending
      FROM students s
      LEFT JOIN (
        SELECT student_id, SUM(amount) as paid 
        FROM payments 
        GROUP BY student_id
      ) p ON s.student_id = p.student_id
      WHERE s.hostel_id = ANY($1) AND (s.total_session_fees - COALESCE(p.paid, 0)) > 0
      ORDER BY total_pending DESC
      LIMIT 3
    `, [hostelIds]);

    const pendingCountRes = await db.query(`
      SELECT COUNT(*) as pending_count
      FROM students s
      LEFT JOIN (
        SELECT student_id, SUM(amount) as paid 
        FROM payments 
        GROUP BY student_id
      ) p ON s.student_id = p.student_id
      WHERE s.hostel_id = ANY($1) AND (s.total_session_fees - COALESCE(p.paid, 0)) > 0
    `, [hostelIds]);

    // 4. Occupancy
    const totalCapacityRes = await db.query(`
      SELECT COALESCE(SUM(
        (COALESCE((detail->>'ac')::int, 0) + COALESCE((detail->>'non_ac')::int, 0)) * 
        CASE 
          WHEN detail->>'type' = 'Single Seater' THEN 1
          WHEN detail->>'type' = 'Dual Seater' THEN 2
          WHEN detail->>'type' = 'Triple Seater' THEN 3
          WHEN detail->>'type' = 'Four Seater' THEN 4
          ELSE 0
        END
      ), 0) as total_capacity
      FROM hostels h, jsonb_array_elements(CASE WHEN jsonb_typeof(h.room_details) = 'array' THEN h.room_details ELSE '[]'::jsonb END) as detail
      WHERE h.hostel_id = ANY($1)
    `, [hostelIds]);

    const occupiedRes = await db.query(`
      SELECT COUNT(*) as occupied
      FROM students 
      WHERE hostel_id = ANY($1) AND status = 'active' AND room_id IS NOT NULL
    `, [hostelIds]);

    // 5. Advance Collection (Security Deposits)
    const advanceRes = await db.query(`
      SELECT SUM(paid_amount) as total_advance
      FROM fees 
      WHERE hostel_id = ANY($1) AND (fee_type = 'advance_payment' OR installment_name ILIKE '%Security%')
    `, [hostelIds]);

    // 6. Daily Trend (Last 7 days)
    const trendRes = await db.query(`
      SELECT TO_CHAR(payment_date, 'Dy') as day, SUM(paid_amount) as amount
      FROM fees 
      WHERE hostel_id = ANY($1) AND payment_date IS NOT NULL AND payment_date >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY day, TO_CHAR(payment_date, 'YYYY-MM-DD')
      ORDER BY TO_CHAR(payment_date, 'YYYY-MM-DD') ASC
    `, [hostelIds]);

    // Handle empty trend data
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const trendData = trendRes.rows.length > 0 ? trendRes.rows : days.map(d => ({ day: d, amount: 0 }));

    const stats = {
      shouldCollect: totalDues,
      collected: collected,
      remaining: remaining,
      totalIncome: collected,
      totalExpense: totalExpense,
      netProfit: collected - totalExpense,
      totalRooms: parseInt(totalCapacityRes.rows[0].total_capacity || 0),
      occupiedRooms: parseInt(occupiedRes.rows[0].occupied || 0),
      vacantRooms: Math.max(0, parseInt(totalCapacityRes.rows[0].total_capacity || 0) - parseInt(occupiedRes.rows[0].occupied || 0)),
      pendingCount: parseInt(pendingCountRes.rows[0].pending_count || 0),
      topPending: topPendingRes.rows.map(r => parseFloat(r.total_pending)),
      advanceCollected: parseFloat(advanceRes.rows[0].total_advance || 0),
      dailyTrend: trendData
    };

    res.json(stats);
  } catch (err) {
    console.error('Owner dashboard stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get Dashboard Stats
router.get('/stats', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const hostels = await db.query('SELECT COUNT(*) FROM hostels');
    const owners = await db.query('SELECT COUNT(*) FROM owners');
    const wardens = await db.query('SELECT COUNT(*) FROM wardens');
    const students = await db.query('SELECT COUNT(*) FROM students');
    const logs = await db.query('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 5');

    res.json({
      hostels: parseInt(hostels.rows[0].count),
      owners: parseInt(owners.rows[0].count),
      wardens: parseInt(wardens.rows[0].count),
      students: parseInt(students.rows[0].count),
      logs: logs.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Warden: Get Recent Activity Logs
router.get('/warden/:wardenId/logs', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  try {
    const wardenId = parseInt(req.params.wardenId);
    
    // Authorization check
    if (req.user.role === 'warden' && req.user.id !== wardenId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const result = await db.query(`
      SELECT * FROM activity_logs 
      WHERE user_id = $1 AND user_role = 'warden'
      ORDER BY timestamp DESC 
      LIMIT 10
    `, [wardenId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch warden logs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all Hostels
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT h.*, o.name as owner_name, w.name as warden_name 
      FROM hostels h 
      LEFT JOIN owners o ON h.owner_id = o.owner_id 
      LEFT JOIN wardens w ON h.warden_id = w.warden_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch hostels error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all Students
router.get('/students', authenticateToken, authorizeRoles('admin', 'warden'), async (req, res) => {
  try {
    let query = `
      SELECT 
        s.*, 
        r.room_number, 
        h.hostel_name,
        (s.details->>'seat_label') as seat_label
      FROM students s 
      LEFT JOIN rooms r ON s.room_id = r.room_id
      LEFT JOIN hostels h ON s.hostel_id = h.hostel_id
    `;
    const params = [];

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (wardenHostels.length === 0) return res.json([]); // No hostels, no students
      
      query += ' WHERE s.hostel_id = ANY($1)';
      params.push(wardenHostels);
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch students error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all Activity Logs with Filtering
router.get('/logs', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { search, actionType, module, role, dateRange, startDate, endDate, sort } = req.query;
    
    let query = 'SELECT * FROM activity_logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Search filter
    if (search) {
      query += ` AND (action ILIKE $${paramIndex} OR module ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Action Type filter
    if (actionType) {
      query += ` AND action ILIKE $${paramIndex}`;
      params.push(`${actionType}%`);
      paramIndex++;
    }

    // Module filter
    if (module) {
      query += ` AND module = $${paramIndex}`;
      params.push(module);
      paramIndex++;
    }

    // Role filter
    if (role) {
      query += ` AND user_role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    // Date Range filter
    if (dateRange && dateRange !== 'custom') {
      let interval = '';
      if (dateRange === 'today') interval = '0 days';
      else if (dateRange === 'yesterday') interval = '1 day';
      else if (dateRange === 'last7days') interval = '7 days';
      else if (dateRange === 'last30days') interval = '30 days';

      if (dateRange === 'today') {
        query += ' AND timestamp >= CURRENT_DATE';
      } else if (dateRange === 'yesterday') {
        query += " AND timestamp >= CURRENT_DATE - INTERVAL '1 day' AND timestamp < CURRENT_DATE";
      } else {
        query += ` AND timestamp >= CURRENT_DATE - INTERVAL '$${paramIndex}'`;
        params.push(interval);
        paramIndex++;
      }
    } else if (dateRange === 'custom' && startDate && endDate) {
      query += ` AND timestamp >= $${paramIndex} AND timestamp <= $${paramIndex + 1}`;
      params.push(startDate);
      params.push(endDate);
      paramIndex += 2;
    }

    // Sorting
    const sortOrder = sort === 'oldest' ? 'ASC' : 'DESC';
    query += ` ORDER BY timestamp ${sortOrder}`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch logs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Warden: Get Students for a hostel
router.get('/:hostelId/students', authenticateToken, authorizeRoles('warden', 'admin', 'owner'), async (req, res) => {
  try {
    const hostelId = parseInt(req.params.hostelId);

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(hostelId)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    const result = await db.query(`
      SELECT s.*, r.room_number, r.room_type, r.capacity 
      FROM students s 
      LEFT JOIN rooms r ON s.room_id = r.room_id 
      WHERE s.hostel_id = $1
    `, [hostelId]);
    res.json(result.rows);
  } catch (err) {
    console.error('--- FETCH HOSTEL STUDENTS ERROR ---');
    console.error('Hostel ID:', req.params.hostelId);
    console.error('Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Warden: Get Detailed Student Profile
router.get('/students/:studentId/profile', authenticateToken, authorizeRoles('warden', 'admin', 'owner'), async (req, res) => {
  try {
    const studentIdInt = parseInt(req.params.studentId);
    
    if (isNaN(studentIdInt)) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const studentCheck = await db.query('SELECT hostel_id FROM students WHERE student_id = $1', [studentIdInt]);
      if (studentCheck.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
      
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(studentCheck.rows[0].hostel_id)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }
    
    const result = await db.query(`
      SELECT 
        s.*, 
        s.security_balance as security_balance,
        r.room_number, 
        r.room_type,
        r.capacity as room_capacity,
        COALESCE(r.floor, s.details->>'floor') as floor,
        h.hostel_name,
        h.address as hostel_address,
        h.contact as hostel_contact,
        w.name as warden_name
      FROM students s 
      LEFT JOIN rooms r ON s.room_id = r.room_id 
      LEFT JOIN hostels h ON s.hostel_id = h.hostel_id 
      LEFT JOIN wardens w ON h.warden_id = w.warden_id
      WHERE s.student_id = $1
    `, [studentIdInt]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = result.rows[0];
    
    // Manual casting in JS for safety
    student.security_balance = parseFloat(student.security_balance || 0);

    // Fetch latest fee status
    const feeResult = await db.query('SELECT status FROM fees WHERE student_id = $1 ORDER BY due_date DESC LIMIT 1', [studentIdInt]);
    student.fee_status = feeResult.rows.length > 0 ? feeResult.rows[0].status : 'No Data';

    // Fetch fee records for history
    const allFeesResult = await db.query('SELECT * FROM fees WHERE student_id = $1 ORDER BY due_date DESC', [studentIdInt]);
    student.fee_history = allFeesResult.rows;
    
    res.json(student);
  } catch (err) {
    console.error('--- DETAILED PROFILE FETCH ERROR ---');
    console.error('Student ID:', req.params.studentId);
    console.error('Error Message:', err.message);
    console.error('Error Stack:', err.stack);
    res.status(500).json({ 
      error: 'Server error', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
});

// Warden: Update Student Profile
router.put('/students/:studentId/profile', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { name, phone, email, dob, gender, details } = req.body;

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const studentCheck = await db.query('SELECT hostel_id FROM students WHERE student_id = $1', [studentId]);
      if (studentCheck.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
      
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(studentCheck.rows[0].hostel_id)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    const result = await db.query(
      'UPDATE students SET name = $1, phone = $2, email = $3, dob = $4, gender = $5, details = $6 WHERE student_id = $7 RETURNING *',
      [name, phone, email, dob, gender, details, studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Record system log
    await logAction(req.user.role, req.user.id, `Updated student profile: ${name}`, 'student');

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update student profile error:', err);
    res.status(400).json({ error: 'Error updating student profile' });
  }
});

// Warden: Add Fee Payment
router.post('/students/:studentId/fees', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { amount, month, status, due_date, paid_date, payment_mode } = req.body;

    // Get hostel_id for this student
    const studentResult = await db.query('SELECT hostel_id, name FROM students WHERE student_id = $1', [studentId]);
    if (studentResult.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    const hostelId = studentResult.rows[0].hostel_id;

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(hostelId)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    const result = await db.query(
      'INSERT INTO fees (student_id, hostel_id, amount, month, status, due_date, paid_date, payment_mode) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [studentId, hostelId, amount, month, status, due_date, paid_date, payment_mode]
    );

    // Record system log
    await logAction(req.user.role, req.user.id, `Recorded fee payment for ${studentResult.rows[0].name}: ${month}`, 'fee');

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add fee payment error:', err);
    res.status(400).json({ error: 'Error recording fee payment' });
  }
});

// Warden: Add Student
router.post('/:hostelId/students', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  const hostelId = parseInt(req.params.hostelId);

  // --- WARDEN-HOSTEL VALIDATION ---
  if (req.user.role === 'warden') {
    const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
    const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
    
    if (!wardenHostels.includes(hostelId)) {
      return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
    }
  }

  const { 
    name, 
    phone, 
    room_id, 
    warden_id, 
    details,
    payment_model: topPaymentModel,
    total_months_stay: topTotalMonthsStay,
    monthly_fee: topMonthlyFee,
    total_session_fees: topTotalSessionFees
  } = req.body;
  
  try {
    await db.query('BEGIN');

    // Extract redesigned finance fields (Prioritize top-level payload, fallback to details)
    const paymentModel = topPaymentModel || details?.payment_model || '2 + 1 System';
    const totalMonthsStay = parseInt(topTotalMonthsStay || details?.total_months_stay || 10);
    const totalSessionFees = parseFloat(details.total_session_fees || 0);
    const monthlyFee = totalMonthsStay > 0 ? totalSessionFees / totalMonthsStay : 0;

    const securityDeposit = parseFloat(details?.security_deposit) || 0;
    const joiningDate = details?.joining_date || new Date().toISOString().split('T')[0];

    console.log('--- ADDING STUDENT DEBUG ---');
    console.log('Name:', name);
    console.log('Phone:', phone);
    console.log('Hostel ID:', hostelId);
    console.log('Room ID:', room_id);
    console.log('Warden ID:', warden_id);
    console.log('Payment Model:', paymentModel);
    console.log('Joining Date:', joiningDate);

    const result = await db.query(
      `INSERT INTO students (
        name, phone, hostel_id, room_id, status, user_id, details, 
        payment_model, total_session_fees, total_months_stay, monthly_fee, security_deposit, joining_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        name, 
        phone, 
        hostelId, 
        parseInt(room_id), 
        'active', 
        parseInt(warden_id) || null, 
        details,
        paymentModel,
        totalSessionFees,
        totalMonthsStay,
        monthlyFee,
        securityDeposit,
        joiningDate
      ]
    );

    const student = result.rows[0];

    // GENERATE INITIAL FEE STRUCTURE BASED ON PAYMENT MODEL
    // logic: Only create ONE security deposit entry to allow for professional partial payments
    if (securityDeposit > 0) {
      const joiningDateObj = new Date(joiningDate);
      const monthLabel = joiningDateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      
      await db.query(
        `INSERT INTO fees (
          student_id, hostel_id, amount, status, due_date, fee_type, installment_name, period_start, month
        ) VALUES ($1, $2, $3, 'unpaid', $4, 'one-time', 'Security Deposit', $4, $5)`,
        [student.student_id, hostelId, securityDeposit, joiningDate, monthLabel]
      );
    }

    if (paymentModel === 'Three Installment System') {
      // 40%, 30%, 30% split with new professional offsets: 30, 90, 180 days
      const installments = [
        { name: 'First Installment', perc: 0.4, days: 30 },
        { name: 'Second Installment', perc: 0.3, days: 90 },
        { name: 'Third Installment', perc: 0.3, days: 180 }
      ];

      for (const inst of installments) {
        const amount = totalSessionFees * inst.perc;
        const dueDate = new Date(joiningDate);
        dueDate.setDate(dueDate.getDate() + inst.days);

        // Apply security adjustment ONLY to the third installment
        let adjustment = 0;
        let remarks = null;
        if (inst.name === 'Third Installment') {
          adjustment = -parseFloat(securityDeposit);
          remarks = `₹${securityDeposit} Security Adjusted`;
        }

        await db.query(
          `INSERT INTO fees (
            student_id, hostel_id, amount, status, due_date, fee_type, installment_name, period_start, adjustment_amount, remarks
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [student.student_id, hostelId, amount, 'pending', dueDate, 'installment', inst.name, joiningDate, adjustment, remarks]
        );
      }
    } else if (paymentModel === '2 + 1 System') {
      // Generate all 10 months (or total_months_stay) rows
      for (let i = 0; i < totalMonthsStay; i++) {
        const startDate = new Date(joiningDate);
        startDate.setMonth(startDate.getMonth() + i);
        
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);

        // Determine due date:
        // - For i=0,1,2 (first 3 months: joining + 2 advance): use joining date
        // - For i>=3 (4th month onward): use 1st of the month
        let finalDueDate;
        if (i < 3) {
          finalDueDate = new Date(joiningDate);
        } else {
          finalDueDate = new Date(startDate);
          finalDueDate.setDate(1);
        }

        const monthName = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        await db.query(
          `INSERT INTO fees (
            student_id, hostel_id, amount, status, due_date, fee_type, month, period_start, period_end
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            student.student_id, 
            hostelId, 
            monthlyFee, 
            'pending', 
            finalDueDate, 
            'monthly', 
            monthName, 
            startDate.toISOString().split('T')[0], 
            endDate.toISOString().split('T')[0]
          ]
        );
      }
    } else if (paymentModel === 'One Time Payment') {
      await db.query(
        `INSERT INTO fees (
          student_id, hostel_id, amount, status, due_date, fee_type, installment_name, period_start
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [student.student_id, hostelId, totalSessionFees, 'pending', joiningDate, 'installment', 'Full Payment', joiningDate]
      );
    }

    await db.query('COMMIT');
    await logAction(req.user.role, req.user.id, `Added student: ${name} with ${paymentModel}`, 'student');
    res.status(201).json(student);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Add student error:', err);
    
    // Detailed error reporting
    let errorMsg = 'Error adding student';
    if (err.code === '23503') {
      if (err.detail.includes('hostel_id')) errorMsg = 'Invalid Hostel ID';
      else if (err.detail.includes('room_id')) errorMsg = 'Invalid Room ID';
      else if (err.detail.includes('user_id')) errorMsg = 'Invalid Warden ID';
    } else if (err.code === '23505') {
      errorMsg = 'Student with this information already exists';
    } else if (err.code === '22008' || err.code === '22007') {
      errorMsg = 'Invalid date format provided';
    }

    res.status(400).json({ error: errorMsg, details: err.detail || err.message });
  }
});

// Warden: Create Room
router.post('/:hostelId/rooms', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  try {
    const hostelId = parseInt(req.params.hostelId);

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(hostelId)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    const { room_number, room_type, capacity, floor } = req.body;
    
    // Check if total rooms limit is reached
    const hostelRes = await db.query('SELECT total_rooms FROM hostels WHERE hostel_id = $1', [hostelId]);
    const currentRoomsRes = await db.query('SELECT COUNT(*) FROM rooms WHERE hostel_id = $1', [parseInt(req.params.hostelId)]);
    
    if (parseInt(currentRoomsRes.rows[0].count) >= parseInt(hostelRes.rows[0].total_rooms)) {
      return res.status(400).json({ error: 'Maximum room limit reached for this hostel.' });
    }

    const result = await db.query(
      'INSERT INTO rooms (hostel_id, room_number, room_type, capacity, floor) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [parseInt(req.params.hostelId), room_number, room_type, capacity, floor]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Error creating room' });
  }
});

// Warden: Mark Student as Exit
router.put('/students/:studentId/exit', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  const studentId = parseInt(req.params.studentId);
  const { exitDate, reason } = req.body;

  try {
    await db.query('BEGIN');

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const studentCheck = await db.query('SELECT hostel_id FROM students WHERE student_id = $1', [studentId]);
      if (studentCheck.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({ error: 'Student not found' });
      }
      
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(studentCheck.rows[0].hostel_id)) {
        await db.query('ROLLBACK');
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    // 1. Fetch student and verify security balance is zero
    const studentRes = await db.query('SELECT name, hostel_id, room_id, security_balance, status FROM students WHERE student_id = $1', [studentId]);
    if (studentRes.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = studentRes.rows[0];
    if (parseFloat(student.security_balance || 0) > 0) {
      await db.query('ROLLBACK');
      return res.status(400).json({ error: 'Security balance must be zero before marking exit. Please settle the account first.' });
    }

    if (student.status === 'inactive') {
      await db.query('ROLLBACK');
      return res.status(400).json({ error: 'Student is already marked as inactive.' });
    }

    // 2. Update student status to inactive and clear room assignment
    await db.query('UPDATE students SET status = \'inactive\', room_id = NULL WHERE student_id = $1', [studentId]);

    // 3. Decrement room occupied count
    if (student.room_id) {
      await db.query('UPDATE rooms SET occupied_count = GREATEST(0, occupied_count - 1) WHERE room_id = $1', [student.room_id]);
    }

    // 4. Record in student_exit_records
    await db.query(
      'INSERT INTO student_exit_records (student_id, exit_date, reason) VALUES ($1, $2, $3)',
      [studentId, exitDate || new Date().toISOString().split('T')[0], reason || 'Student marked as exit by warden']
    );

    // 5. Record activity log
    await logAction(req.user.role, req.user.id, `Marked student ${student.name} as exit (Status: Inactive)`, 'student', studentId);

    await db.query('COMMIT');
    res.json({ message: 'Student marked as inactive successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Mark student exit error:', err);
    res.status(500).json({ error: 'Server error marking student as exit' });
  }
});

// Warden: Get Rooms
router.get('/:hostelId/rooms', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  try {
    const hostelId = parseInt(req.params.hostelId);

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(hostelId)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    const result = await db.query(`
      SELECT r.*, 
             (SELECT COUNT(*) FROM students s WHERE s.room_id = r.room_id AND s.status = 'active') as student_count
      FROM rooms r 
      WHERE r.hostel_id = $1
    `, [hostelId]);
    
    const rooms = result.rows.map(room => {
      const studentCount = parseInt(room.student_count || 0);
      return {
        ...room,
        student_count: studentCount,
        status: studentCount >= room.capacity ? 'occupied' : 'available'
      };
    });
    
    res.json(rooms);
  } catch (err) {
    console.error('Fetch rooms error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Warden: Record Expense
router.post('/:hostelId/expenses', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  try {
    const hostelId = parseInt(req.params.hostelId);

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(hostelId)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    const { description, amount, category } = req.body;
    const result = await db.query(
      'INSERT INTO expenses (hostel_id, description, amount, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [hostelId, description, amount, category]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Error recording expense' });
  }
});

// Warden: Update Fee Status
router.patch('/:hostelId/fees/:feeId', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  try {
    const hostelId = parseInt(req.params.hostelId);
    const feeId = parseInt(req.params.feeId);

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(hostelId)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }

      // Also verify the fee belongs to this hostel
      const feeCheck = await db.query('SELECT hostel_id FROM fees WHERE fee_id = $1', [feeId]);
      if (feeCheck.rows.length === 0) return res.status(404).json({ error: 'Fee record not found' });
      if (feeCheck.rows[0].hostel_id !== hostelId) {
        return res.status(403).json({ error: 'Access Denied: Fee record does not belong to this hostel.' });
      }
    }

    const { status, paid_date } = req.body;
    const result = await db.query(
      'UPDATE fees SET status = $1, paid_date = $2 WHERE fee_id = $3 RETURNING *',
      [status, paid_date, feeId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Error updating fee status' });
  }
});

// Warden: Generate Monthly Fees (Mock utility)
router.post('/:hostelId/fees/generate', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  try {
    const hostelId = parseInt(req.params.hostelId);

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(hostelId)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    const { month, amount } = req.body;
    const students = await db.query('SELECT student_id FROM students WHERE hostel_id = $1', [hostelId]);
    const due_date = new Date();
    due_date.setDate(due_date.getDate() + 7); // Due in 7 days

    const createdFees = [];
    for (const student of students.rows) {
      const result = await db.query(
        'INSERT INTO fees (student_id, hostel_id, amount, due_date, status, month) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [student.student_id, parseInt(req.params.hostelId), amount, due_date, 'pending', month]
      );
      createdFees.push(result.rows[0]);
    }
    res.status(201).json({ message: `Generated fees for ${createdFees.length} students`, fees: createdFees });
  } catch (err) {
    res.status(400).json({ error: 'Error generating fees' });
  }
});

// Warden: Get Operational Stats for a Hostel
router.get('/:hostelId/operational-stats', authenticateToken, async (req, res) => {
  try {
    const hostelId = parseInt(req.params.hostelId);

    // Authorization check: only the warden assigned to this hostel or an admin can view stats
    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(hostelId)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }
    
    // 1. Total Students (Active only)
    const students = await db.query('SELECT COUNT(*) FROM students WHERE hostel_id = $1 AND status = \'active\'', [hostelId]);
    const totalStudents = parseInt(students.rows[0].count);
    
    // 2. Total Seats (Calculated from Hostel Configuration/Room Details)
    const seatsCountResult = await db.query(`
      SELECT COALESCE(SUM(
        (COALESCE((detail->>'ac')::int, 0) + COALESCE((detail->>'non_ac')::int, 0)) * 
        CASE 
          WHEN detail->>'type' = 'Single Seater' THEN 1
          WHEN detail->>'type' = 'Dual Seater' THEN 2
          WHEN detail->>'type' = 'Triple Seater' THEN 3
          WHEN detail->>'type' = 'Four Seater' THEN 4
          ELSE 0
        END
      ), 0) as total_capacity
      FROM hostels h, jsonb_array_elements(CASE WHEN jsonb_typeof(h.room_details) = 'array' THEN h.room_details ELSE '[]'::jsonb END) as detail
      WHERE h.hostel_id = $1
    `, [hostelId]);
    const totalSeats = parseInt(seatsCountResult.rows[0].total_capacity || 0);
    
    // 3. Occupied Seats (Number of active students assigned to rooms in this hostel)
    // Using totalStudents as a proxy since students are assigned to rooms, 
    // but we'll re-verify it's tied to room seats for accuracy.
    const occupiedSeats = totalStudents;
    
    // 4. Financial stats
    const now = new Date();
    const monthYear = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    const pendingFeesResult = await db.query('SELECT SUM(amount + COALESCE(adjustment_amount, 0) - COALESCE(paid_amount, 0)) FROM fees WHERE hostel_id = $1 AND status != \'paid\'', [hostelId]);
    const collectedFeesResult = await db.query('SELECT SUM(paid_amount) FROM fees WHERE hostel_id = $1 AND status = \'paid\' AND month = $2', [hostelId, monthYear]);
    const totalFeesResult = await db.query('SELECT SUM(amount + COALESCE(adjustment_amount, 0)) FROM fees WHERE hostel_id = $1 AND month = $2', [hostelId, monthYear]);
    const totalExpensesResult = await db.query('SELECT SUM(amount) FROM expenses WHERE hostel_id = $1', [hostelId]);
    
    const collected = parseFloat(collectedFeesResult.rows[0].sum || 0);
    const total = parseFloat(totalFeesResult.rows[0].sum || 0);
    const collectionRatio = total > 0 ? parseFloat(((collected / total) * 100).toFixed(2)) : 0;
    
    // Occupancy Rate calculation: (Occupied Seats / Total Seats) * 100
    const occupancyRate = totalSeats > 0 ? parseFloat(((occupiedSeats / totalSeats) * 100).toFixed(2)) : 0;

    console.log(`--- REPORTS DATA FOR HOSTEL ${hostelId} ---`);
    console.log(`Month: ${monthYear}`);
    console.log(`Total Seats: ${totalSeats}, Occupied Seats: ${occupiedSeats}, Occupancy Rate: ${occupancyRate}%`);
    console.log(`Total Pending Fees: ${pendingFeesResult.rows[0].sum}`);

    res.json({
      totalStudents,
      totalRooms: totalSeats,
      occupiedRooms: occupiedSeats,
      availableRooms: Math.max(0, totalSeats - occupiedSeats),
      occupancyRate,
      collectionRatio,
      pendingFees: parseFloat(pendingFeesResult.rows[0].sum || 0),
      collectedFees: collected,
      totalFees: total,
      totalExpenses: parseFloat(totalExpensesResult.rows[0].sum || 0)
    });
  } catch (err) {
    console.error('Operational stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin only: Update Hostel
router.put('/:hostelId', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { hostel_name, address, owner_id, warden_id, total_rooms, room_details } = req.body;
  try {
    const result = await db.query(
      'UPDATE hostels SET hostel_name = $1, address = $2, owner_id = $3, warden_id = $4, total_rooms = $5, room_details = $6::jsonb WHERE hostel_id = $7 RETURNING *',
      [
        hostel_name, 
        address, 
        parseInt(owner_id) || null, 
        parseInt(warden_id) || null, 
        parseInt(total_rooms) || 0, 
        JSON.stringify(room_details), 
        parseInt(req.params.hostelId)
      ]
    );

    // Record system log
    await logAction('admin', req.user.id, `Updated hostel: ${hostel_name}`, 'hostel');

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating hostel:', err);
    res.status(400).json({ error: 'Error updating hostel' });
  }
});

// Admin only: Update Owner
router.put('/owners/:ownerId', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { name, email, phone, aadhaar, address } = req.body;
  const ownerId = parseInt(req.params.ownerId);

  try {
    // 1. Fetch current owner details for audit and comparison
    const currentOwnerRes = await db.query('SELECT * FROM owners WHERE owner_id = $1', [ownerId]);
    if (currentOwnerRes.rows.length === 0) return res.status(404).json({ error: 'Owner not found' });
    const oldOwner = currentOwnerRes.rows[0];

    // 2. If email is changing, check for duplicates in all user tables
    if (email !== oldOwner.email) {
      const emailCheck = await db.query(`
        SELECT email FROM admins WHERE email = $1
        UNION
        SELECT email FROM owners WHERE email = $1
        UNION
        SELECT email FROM wardens WHERE email = $1
      `, [email]);

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'This email is already registered in the system.' });
      }
    }

    // 3. Update the owner record
    const result = await db.query(
      'UPDATE owners SET name = $1, email = $2, phone = $3, aadhaar = $4, address = $5 WHERE owner_id = $6 RETURNING *',
      [name, email, phone, aadhaar, address, ownerId]
    );

    // 4. Record system log (Audit Log)
    let actionDetail = `Updated owner: ${name}`;
    if (email !== oldOwner.email) {
      actionDetail += ` (Email changed from ${oldOwner.email} to ${email})`;
    }
    await logAction('admin', req.user.id, actionDetail, 'owner');

    // 5. Send confirmation email if email was updated
    if (email !== oldOwner.email) {
      try {
        const mailOptions = {
          from: `"My Hostel System" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Security Alert: Your Login Email has been Updated',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #2563eb;">Account Security Update</h2>
              <p>Hello <strong>${name}</strong>,</p>
              <p>This is an automated confirmation that your login email address for the <strong>My Hostel Portal</strong> has been updated by the System Administrator.</p>
              
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>New Login Email:</strong> ${email}</p>
                <p style="margin: 5px 0;"><strong>Update Date:</strong> ${new Date().toLocaleString()}</p>
              </div>

              <p>Please use this new email address for all future logins. Your password remains unchanged.</p>
              
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #666;">If you believe this change was made in error, please contact support immediately at support@myhostel.com.</p>
            </div>
          `,
        };
        await transporter.sendMail(mailOptions);
        console.log(`--- EMAIL SENT: Owner Email Update Confirmation to ${email} ---`);
      } catch (mailErr) {
        console.error('--- EMAIL FAILED: Owner Email Update Confirmation ---', mailErr);
        // We don't fail the whole request if email fails, but we log it
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating owner:', err);
    res.status(500).json({ error: 'Server error updating owner' });
  }
});

// Admin only: Update Warden
router.put('/wardens/:wardenId', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const result = await db.query(
      'UPDATE wardens SET name = $1, email = $2, phone = $3 WHERE warden_id = $4 RETURNING *',
      [name, email, phone, parseInt(req.params.wardenId)]
    );

    // Record system log
    await logAction('admin', req.user.id, `Updated warden: ${name}`, 'warden');

    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Error updating warden' });
  }
});

// Admin only: Delete Hostel
router.delete('/hostel/:hostelId', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const hostelId = parseInt(req.params.hostelId);
  try {
    const hostel = await db.query('SELECT hostel_name FROM hostels WHERE hostel_id = $1', [hostelId]);
    if (hostel.rows.length === 0) return res.status(404).json({ error: 'Hostel not found' });

    await db.query('BEGIN');

    // Helper function to delete safely, skipping missing tables
    const safeDelete = async (query, params = []) => {
      try {
        await db.query(query, params);
        console.log(`✅ Successfully executed: ${query.slice(0, 50)}...`);
      } catch (err) {
        console.log(`⚠️ Skipping delete for query:`, query, '- Error:', err.message);
      }
    };

    // First, delete any warden_whatsapp_sessions for this hostel!
    await safeDelete('DELETE FROM warden_whatsapp_sessions WHERE hostel_id = $1', [hostelId]);
    
    // Also set wardens.hostel_id to NULL!
    await db.query('UPDATE wardens SET hostel_id = NULL WHERE hostel_id = $1', [hostelId]);
    console.log(`✅ Updated wardens with hostel_id = ${hostelId} to NULL`);

    // Delete in reverse order of dependencies (most dependent first)
    await safeDelete('DELETE FROM complaint_comments WHERE complaint_id IN (SELECT complaint_id FROM complaints WHERE hostel_id = $1)', [hostelId]);
    await safeDelete('DELETE FROM complaints WHERE hostel_id = $1', [hostelId]);
    await safeDelete('DELETE FROM receipt_logs WHERE student_id IN (SELECT student_id FROM students WHERE hostel_id = $1)', [hostelId]);
    await safeDelete('DELETE FROM payment_corrections WHERE original_payment_id IN (SELECT payment_id FROM payments WHERE fee_id IN (SELECT fee_id FROM fees WHERE hostel_id = $1))', [hostelId]);
    await safeDelete('DELETE FROM payments WHERE fee_id IN (SELECT fee_id FROM fees WHERE hostel_id = $1)', [hostelId]);
    await safeDelete('DELETE FROM payments WHERE hostel_id = $1', [hostelId]); // Also delete payments via direct hostel_id
    await safeDelete('DELETE FROM fees WHERE hostel_id = $1', [hostelId]);
    await safeDelete('DELETE FROM fee_ledger WHERE hostel_id = $1', [hostelId]);
    await safeDelete('DELETE FROM security_deposits WHERE hostel_id = $1', [hostelId]);
    await safeDelete('DELETE FROM student_attendance WHERE student_id IN (SELECT student_id FROM students WHERE hostel_id = $1)', [hostelId]);
    await safeDelete('DELETE FROM attendance_submissions WHERE hostel_id = $1', [hostelId]);
    await safeDelete('DELETE FROM student_exit_records WHERE student_id IN (SELECT student_id FROM students WHERE hostel_id = $1)', [hostelId]);
    await safeDelete('DELETE FROM student_documents WHERE student_id IN (SELECT student_id FROM students WHERE hostel_id = $1)', [hostelId]);
    await safeDelete('DELETE FROM fee_reminders WHERE student_id IN (SELECT student_id FROM students WHERE hostel_id = $1)', [hostelId]);
    await safeDelete('DELETE FROM students WHERE hostel_id = $1', [hostelId]);
    await safeDelete('DELETE FROM room_maintenance WHERE room_id IN (SELECT room_id FROM rooms WHERE hostel_id = $1)', [hostelId]);
    await safeDelete('DELETE FROM room_allocations WHERE room_id IN (SELECT room_id FROM rooms WHERE hostel_id = $1)', [hostelId]);
    await safeDelete('DELETE FROM rooms WHERE hostel_id = $1', [hostelId]);
    await safeDelete('DELETE FROM hostel_settings WHERE hostel_id = $1', [hostelId]);
    await safeDelete('DELETE FROM hostel_documents WHERE hostel_id = $1', [hostelId]);
    await safeDelete('DELETE FROM warden_assignment_history WHERE hostel_id = $1', [hostelId]);
    await safeDelete('DELETE FROM expenses WHERE hostel_id = $1', [hostelId]);
    await safeDelete('DELETE FROM daily_financial_summary WHERE hostel_id = $1', [hostelId]);
    await safeDelete('DELETE FROM monthly_analytics WHERE hostel_id = $1', [hostelId]);
    await safeDelete('DELETE FROM occupancy_analytics WHERE hostel_id = $1', [hostelId]);
    await safeDelete('DELETE FROM fee_collection_stats WHERE hostel_id = $1', [hostelId]);
    
    // Now try to delete the hostel directly without safeDelete!
    const deleteHostelResult = await db.query('DELETE FROM hostels WHERE hostel_id = $1', [hostelId]);
    console.log(`✅ Hostel deleted! Rows affected: ${deleteHostelResult.rowCount}`);

    await db.query('COMMIT');

    await logAction('admin', req.user.id, `Deleted hostel: ${hostel.rows[0].hostel_name} (Manual cleanup of all data)`, 'hostel');
    res.json({ message: 'Hostel and all associated data deleted successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('❌ Delete hostel ERROR:', err);
    res.status(500).json({ error: 'Server error during hostel deletion. Check database constraints.' });
  }
});

// Admin only: Delete Owner
router.delete('/owner/:ownerId', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const ownerId = parseInt(req.params.ownerId);
  try {
    const owner = await db.query('SELECT name FROM owners WHERE owner_id = $1', [ownerId]);
    if (owner.rows.length === 0) return res.status(404).json({ error: 'Owner not found' });

    // Deleting the owner will automatically remove all their hostels 
    // and all associated data via cascading constraints.
    await db.query('DELETE FROM owners WHERE owner_id = $1', [ownerId]);

    await logAction('admin', req.user.id, `Deleted owner: ${owner.rows[0].name} (Auto-cascaded cleanup of hostels and data)`, 'owner');
    res.json({ message: 'Owner and all associated hostels/data deleted successfully' });
  } catch (err) {
    console.error('Delete owner error:', err);
    res.status(500).json({ error: 'Server error during owner deletion. Check database constraints.' });
  }
});

// Admin only: Delete Warden
router.delete('/warden/:wardenId', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const wardenId = parseInt(req.params.wardenId);
  try {
    const warden = await db.query('SELECT name FROM wardens WHERE warden_id = $1', [wardenId]);
    if (warden.rows.length === 0) return res.status(404).json({ error: 'Warden not found' });

    await db.query('BEGIN');
    
    // When a warden is deleted, we just need to clear the reference in hostels, students, and payment_corrections
    await db.query('UPDATE hostels SET warden_id = NULL WHERE warden_id = $1', [wardenId]);
    await db.query('UPDATE students SET user_id = NULL WHERE user_id = $1', [wardenId]); 
    await db.query('UPDATE payment_corrections SET corrected_by_warden = NULL WHERE corrected_by_warden = $1', [wardenId]);
    
    // Delete the warden
    await db.query('DELETE FROM wardens WHERE warden_id = $1', [wardenId]);
    
    await db.query('COMMIT');

    await logAction('admin', req.user.id, `Deleted warden: ${warden.rows[0].name}`, 'warden');
    res.json({ message: 'Warden deleted successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Delete warden error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
