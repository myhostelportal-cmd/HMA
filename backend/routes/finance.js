const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAction } = require('../utils/logger');

// --- DATABASE MIGRATION START ---
async function runMigrations() {
  try {
    await db.query(`ALTER TABLE fees ADD COLUMN IF NOT EXISTS fee_type VARCHAR(50) DEFAULT 'monthly'`);
    await db.query(`ALTER TABLE fees ADD COLUMN IF NOT EXISTS advance_status VARCHAR(20) DEFAULT 'unadjusted'`);
    await db.query(`ALTER TABLE fees ADD COLUMN IF NOT EXISTS advance_balance DECIMAL(10, 2) DEFAULT 0.00`);
    await db.query(`ALTER TABLE fees ADD COLUMN IF NOT EXISTS security_balance DECIMAL(10, 2) DEFAULT 0.00`);
    await db.query(`ALTER TABLE fees ADD COLUMN IF NOT EXISTS remaining_security DECIMAL(10, 2) DEFAULT 0.00`);
    await db.query(`ALTER TABLE fees ADD COLUMN IF NOT EXISTS payment_source VARCHAR(20) DEFAULT 'DIRECT'`);
    await db.query(`ALTER TABLE fees ADD COLUMN IF NOT EXISTS adjusted_from_advance BOOLEAN DEFAULT FALSE`);
    
    // Ensure payments table has collector_id to track who recorded the payment
    await db.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS collector_id INTEGER`);
    
    // Also ensure students table has security_balance if not already there
    await db.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS security_balance DECIMAL(10, 2) DEFAULT 0.00`);
    console.log('--- DB MIGRATIONS SUCCESSFUL ---');
  } catch (err) {
    console.error('--- DB MIGRATION ERROR ---', err.message);
  }
}
runMigrations();
// --- DATABASE MIGRATION END ---

// Helper: Get next month date with clipping (e.g. Jan 31 -> Feb 28)
function getNextMonthDate(date, monthsToAdd = 1) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + monthsToAdd);
  if (d.getDate() < day) {
    d.setDate(0); // Set to last day of previous month
  }
  return d;
}

// 1. Get Fee Schedule for a student
router.get('/student/:studentId/periods', authenticateToken, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const studentRes = await db.query(`
      SELECT student_id, joining_date, monthly_fee::float, payment_model, security_deposit::float, security_balance::float, total_session_fees::float, total_months_stay, hostel_id
      FROM students 
      WHERE student_id = $1
    `, [studentId]);

    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    
    const student = studentRes.rows[0];
    const { joining_date, payment_model, total_months_stay, hostel_id } = student;
    const monthly_fee = student.monthly_fee || 0;
    const total_session_fees = student.total_session_fees || 0;
    const security_deposit = student.security_deposit || 0;

    // Check if schedule already exists
    let feesRes = await db.query(`
      SELECT f.*, 
             (SELECT json_agg(p.* ORDER BY p.actual_payment_date ASC, p.payment_id ASC) 
              FROM payments p WHERE p.fee_id = f.fee_id) as associated_payments
      FROM fees f
      WHERE f.student_id = $1 
      ORDER BY 
        CASE 
          WHEN f.fee_type = 'remaining' THEN 2 
          ELSE 1 
        END,
        f.period_start ASC, 
        f.fee_id ASC
    `, [studentId]);

    let existingFees = feesRes.rows;

    // DATA SYNC: Correctly calculate remaining security_balance for 2+1 system
    // We strictly use: (Sum of Paid Security Rows) - (Sum of ALL Adjustments from Security)
    const paidSecurityRes = await db.query(`
      SELECT SUM(paid_amount) as total_paid 
      FROM fees 
      WHERE student_id = $1 
      AND (fee_type = 'advance_payment' OR installment_name ILIKE '%Security Deposit%') 
      AND status = 'paid'
    `, [studentId]);
    
    const totalPaidSecurity = parseFloat(paidSecurityRes.rows[0]?.total_paid || 0);
    
    // Calculate total used security from adjustments (sum of all negative adjustment_amounts on months)
    const usedSecurityRes = await db.query(`
      SELECT SUM(ABS(adjustment_amount)) as total_used 
      FROM fees 
      WHERE student_id = $1 
      AND (adjusted_from_advance = TRUE OR payment_source = 'SECURITY' OR payment_source = 'ADVANCE_ADJUSTED' OR (remarks ILIKE '%Security Deposit%' AND adjustment_amount < 0))
      AND fee_type != 'advance_payment' -- Don't count adjustments on the security row itself
    `, [studentId]);
    
    const totalUsedSecurity = parseFloat(usedSecurityRes.rows[0]?.total_used || 0);
    const calculatedBalance = Math.max(0, totalPaidSecurity - totalUsedSecurity);
    
    // Update master record if there's a mismatch
    if (parseFloat(student.security_balance || 0) !== calculatedBalance) {
      await db.query('UPDATE students SET security_balance = $1 WHERE student_id = $2', [calculatedBalance, studentId]);
      student.security_balance = calculatedBalance;
    }

    // IF NO SCHEDULE EXISTS, GENERATE FROM SCRATCH
    if (existingFees.length === 0) {
      await db.query('BEGIN');
      try {
        if (payment_model === 'Three Installment System') {
          // Security Deposit: Joining Date
          const joiningDateObj = new Date(joining_date);
          const monthLabel = joiningDateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
          
          await db.query(`
            INSERT INTO fees (student_id, hostel_id, amount, status, due_date, fee_type, installment_name, period_start, month)
            VALUES ($1, $2, $3, 'unpaid', $4, 'one-time', 'Security Deposit', $4, $5)
          `, [studentId, hostel_id, security_deposit, joining_date, monthLabel]);

          // 1st Installment: Joining + 30 days (40%)
          const firstAmt = parseFloat(total_session_fees) * 0.4;
          const firstDue = new Date(joining_date);
          firstDue.setDate(firstDue.getDate() + 30);
          const firstMonth = firstDue.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
          
          await db.query(`
            INSERT INTO fees (student_id, hostel_id, amount, status, due_date, fee_type, installment_name, period_start, month)
            VALUES ($1, $2, $3, 'unpaid', $4, 'installment', 'First Installment', $5, $6)
          `, [studentId, hostel_id, firstAmt, firstDue, joining_date, firstMonth]);

          // 2nd Installment: Joining + 90 days (30%)
          const secondAmt = parseFloat(total_session_fees) * 0.3;
          const secondDue = new Date(joining_date);
          secondDue.setDate(secondDue.getDate() + 90);
          const secondMonth = secondDue.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
          
          await db.query(`
            INSERT INTO fees (student_id, hostel_id, amount, status, due_date, fee_type, installment_name, period_start, month)
            VALUES ($1, $2, $3, 'unpaid', $4, 'installment', 'Second Installment', $5, $6)
          `, [studentId, hostel_id, secondAmt, secondDue, joining_date, secondMonth]);

          // 3rd Installment: Joining + 180 days (30%) - Apply Security Adjustment
          const thirdAmt = parseFloat(total_session_fees) * 0.3;
          const thirdDue = new Date(joining_date);
          thirdDue.setDate(thirdDue.getDate() + 180);
          const thirdMonth = thirdDue.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
          
          await db.query(`
            INSERT INTO fees (student_id, hostel_id, amount, status, due_date, fee_type, installment_name, period_start, adjustment_amount, remarks, month)
            VALUES ($1, $2, $3, 'unpaid', $4, 'installment', 'Third Installment', $5, $6, $7, $8)
          `, [studentId, hostel_id, thirdAmt, thirdDue, joining_date, -parseFloat(security_deposit), `₹${security_deposit} Security Adjusted`, thirdMonth]);

        } else if (payment_model === '2 + 1 System') {
          // Security Deposit (Total of 2 months) - Stored as a separate balance/wallet
          const joiningDateObj = new Date(joining_date);
          const monthLabel = joiningDateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
          
          await db.query(`
            INSERT INTO fees (student_id, hostel_id, amount, status, due_date, fee_type, installment_name, period_start, month, advance_status, security_balance, remaining_security, advance_balance)
            VALUES ($1, $2, $3, 'unpaid', $4, 'advance_payment', 'Security Deposit', $4, $5, 'unadjusted', $3, $3, $3)
          `, [studentId, hostel_id, monthly_fee * 2, joining_date, monthLabel]);

          // Monthly Cycles
          for (let i = 0; i < total_months_stay; i++) {
            const periodStart = getNextMonthDate(joining_date, i);
            const periodEnd = getNextMonthDate(joining_date, i + 1);
            
            // Determine due date:
            // - For i=0,1,2 (first 3 months: joining + 2 advance): use joining date
            // - For i>=3 (4th month onward): use 1st of the month
            let dueDate;
            if (i < 3) {
              dueDate = new Date(joining_date);
            } else {
              dueDate = new Date(periodStart);
              dueDate.setDate(1);
            }
            
            const monthLabel = `${periodStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${periodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
            
            await db.query(`
              INSERT INTO fees (student_id, hostel_id, amount, status, due_date, fee_type, month, period_start, period_end)
              VALUES ($1, $2, $3, 'unpaid', $4, 'monthly', $5, $6, $7)
            `, [studentId, hostel_id, monthly_fee, dueDate, monthLabel, periodStart, periodEnd]);
          }
        } else if (payment_model === 'One Time Payment') {
          await db.query(`
            INSERT INTO fees (student_id, hostel_id, amount, status, due_date, fee_type, installment_name, period_start)
            VALUES ($1, $2, $3, 'unpaid', $4, 'one-time', 'Full Payment', $4)
          `, [studentId, hostel_id, total_session_fees, joining_date]);
        }
        
        await db.query('COMMIT');
        // Re-fetch
        feesRes = await db.query(`
          SELECT f.*, 
                 (SELECT json_agg(p.* ORDER BY p.actual_payment_date ASC, p.payment_id ASC) 
                  FROM payments p WHERE p.fee_id = f.fee_id) as associated_payments
          FROM fees f
          WHERE f.student_id = $1 
          ORDER BY 
            CASE WHEN f.fee_type = 'remaining' THEN 2 ELSE 1 END,
            f.period_start ASC, 
            f.fee_id ASC
        `, [studentId]);
        existingFees = feesRes.rows;
      } catch (e) {
        await db.query('ROLLBACK');
        throw e;
      }
    }

    // UPDATE STATUSES DYNAMICALLY (Pending logic)
    const today = new Date();
    today.setHours(0,0,0,0);

    existingFees = existingFees.map(f => {
      const dueDate = new Date(f.due_date);
      dueDate.setHours(0,0,0,0);
      
      let status = f.status;
      // Correctly toggle between UNPAID and PENDING based on today's date
      // This ensures future installments (like April/June) show as UNPAID
      if (status === 'unpaid' || status === 'pending') {
        status = today >= dueDate ? 'pending' : 'unpaid';
      }

      // Add month_type for 2+1 system
      let monthType = null;
      if (payment_model === '2 + 1 System' && f.fee_type === 'monthly') {
        const joiningDate = new Date(student.joining_date);
        const periodStart = new Date(f.period_start);

        // Calculate the number of full months passed since joining
        const monthsPassed = (today.getFullYear() - joiningDate.getFullYear()) * 12 + (today.getMonth() - joiningDate.getMonth());

        // Determine the start of the current running month period
        const runningMonthStartDate = new Date(joiningDate);
        runningMonthStartDate.setMonth(runningMonthStartDate.getMonth() + monthsPassed);

        // Determine the start of the next month
        const nextMonthStartDate = new Date(runningMonthStartDate);
        nextMonthStartDate.setMonth(nextMonthStartDate.getMonth() + 1);
        
        // Determine the start of the month after next
        const monthAfterNextStartDate = new Date(runningMonthStartDate);
        monthAfterNextStartDate.setMonth(monthAfterNextStartDate.getMonth() + 2);

        if (periodStart.getFullYear() === runningMonthStartDate.getFullYear() && periodStart.getMonth() === runningMonthStartDate.getMonth()) {
          monthType = 'Running';
        } else if (periodStart.getFullYear() === nextMonthStartDate.getFullYear() && periodStart.getMonth() === nextMonthStartDate.getMonth()) {
          monthType = 'Advance';
        } else if (periodStart.getFullYear() === monthAfterNextStartDate.getFullYear() && periodStart.getMonth() === monthAfterNextStartDate.getMonth()) {
          monthType = 'Advance';
        }
      }

      return { ...f, status, month_type: monthType };
    });

    res.json({
      student,
      existing_fees: existingFees
    });

  } catch (err) {
    console.error('--- FETCH FEE SCHEDULE ERROR ---');
    console.error('Student ID:', req.params.studentId);
    console.error('Error Message:', err.message);
    console.error('Error Stack:', err.stack);
    res.status(500).json({ 
      error: 'Server error fetching fee schedule',
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// 2. Advanced Fee Collection Report API
router.get('/report', authenticateToken, authorizeRoles('owner', 'admin'), async (req, res) => {
  const { fromDate, toDate, studentName, roomNumber, hostel_id, owner_id, phone, hostel_name } = req.query;

  try {
    let query = `
      SELECT 
        p.receipt_id,
        s.name as student_name,
        s.phone as student_phone,
        COALESCE(s.details->>'assigned_slot', r.room_number) as room_number,
        p.amount as amount_paid,
        p.actual_payment_date as payment_date,
        p.created_at as payment_timestamp,
        p.payment_method as payment_mode,
        h.hostel_name,
        COALESCE(a.name, w.name, 'System') as collected_by
      FROM payments p
      JOIN students s ON p.student_id = s.student_id
      JOIN hostels h ON p.hostel_id = h.hostel_id
      LEFT JOIN rooms r ON s.room_id = r.room_id
      LEFT JOIN admins a ON p.collector_id = a.admin_id
      LEFT JOIN wardens w ON p.collector_id = w.warden_id
      WHERE 1=1
    `;
    const params = [];

    // Role-based filtering
    if (req.user.role === 'owner') {
      query += ` AND h.owner_id = $${params.length + 1}`;
      params.push(req.user.id);
    } else if (req.user.role === 'admin' && owner_id && owner_id !== 'all') {
      // Admin can filter by a specific owner
      query += ` AND h.owner_id = $${params.length + 1}`;
      params.push(owner_id);
    }

    if (hostel_id && hostel_id !== 'all') {
      query += ` AND p.hostel_id = $${params.length + 1}`;
      params.push(hostel_id);
    }

    if (fromDate) {
      query += ` AND p.actual_payment_date >= $${params.length + 1}`;
      params.push(fromDate);
    }

    if (toDate) {
      // Add 23:59:59 to toDate to include the entire day
      query += ` AND p.actual_payment_date <= $${params.length + 1}`;
      params.push(toDate + ' 23:59:59');
    }

    // Advanced Searching (Student Name, Hostel Name, Phone Number)
    if (studentName) {
      query += ` AND s.name ILIKE $${params.length + 1}`;
      params.push(`%${studentName}%`);
    }

    if (phone) {
      query += ` AND s.phone ILIKE $${params.length + 1}`;
      params.push(`%${phone}%`);
    }

    if (hostel_name) {
      query += ` AND h.hostel_name ILIKE $${params.length + 1}`;
      params.push(`%${hostel_name}%`);
    }

    if (roomNumber) {
      query += ` AND (s.details->>'assigned_slot' ILIKE $${params.length + 1} OR r.room_number ILIKE $${params.length + 1})`;
      params.push(`%${roomNumber}%`);
    }

    query += ` ORDER BY p.actual_payment_date DESC, p.payment_id DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching fee report:', err);
    res.status(500).json({ error: 'Server error fetching fee report.' });
  }
});

// Helper: Get Owners and their Hostels for Admin Filters
router.get('/report/filters', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const ownersRes = await db.query(`
      SELECT owner_id, name as owner_name 
      FROM owners 
      WHERE status = 'active'
      ORDER BY name ASC
    `);

    const hostelsRes = await db.query(`
      SELECT hostel_id, hostel_name, owner_id 
      FROM hostels 
      ORDER BY hostel_name ASC
    `);

    res.json({
      owners: ownersRes.rows,
      hostels: hostelsRes.rows
    });
  } catch (err) {
    console.error('Error fetching report filters:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Record a Payment (Optimized for Ledger & Auto-Allocation)
router.post('/student/:studentId/pay', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  const studentId = parseInt(req.params.studentId);
  const { 
    amount_paid, 
    payment_method, 
    transaction_id: raw_transaction_id, 
    remarks,
    actual_payment_date
  } = req.body;

  const raw_amount_paid = parseFloat(amount_paid) || 0;
  if (raw_amount_paid <= 0) return res.status(400).json({ error: 'Payment amount must be greater than zero.' });

  // Strictly treat empty strings as null to avoid unique constraint violations on blank IDs
  const transaction_id = (payment_method === 'Cash' || !raw_transaction_id || raw_transaction_id.trim() === "") ? null : raw_transaction_id.trim();
  const paymentDate = (actual_payment_date && actual_payment_date !== "") ? actual_payment_date : new Date();

  try {
    await db.query('BEGIN');

    // Pre-check for duplicate transaction ID within the transaction to prevent race conditions
    // Only check if it's not null
    if (transaction_id) {
      const checkTxn = await db.query('SELECT payment_id FROM payments WHERE transaction_id = $1', [transaction_id]);
      if (checkTxn.rows.length > 0) {
        await db.query('ROLLBACK');
        return res.status(400).json({ error: `This Transaction ID (${transaction_id}) has already been processed.` });
      }
    }

    // --- DOUBLE-PAYMENT ALERT (30-Second Rule) ---
    // Check if the same student paid the same amount within the last 30 seconds
    const recentPaymentRes = await db.query(`
      SELECT payment_id FROM payments 
      WHERE student_id = $1 AND amount = $2 AND actual_payment_date >= NOW() - INTERVAL '30 seconds'
      LIMIT 1
    `, [studentId, raw_amount_paid]);

    if (recentPaymentRes.rows.length > 0) {
      await db.query('ROLLBACK');
      return res.status(400).json({ error: 'Potential duplicate detected. A payment for the same amount was recorded in the last 30 seconds. Please check the ledger before proceeding.' });
    }

    // 1. Fetch Student and all Unpaid/Partial Fees in order
    const studentRes = await db.query('SELECT * FROM students WHERE student_id = $1', [studentId]);
    if (studentRes.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Student record not found' });
    }
    const student = studentRes.rows[0];

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(student.hostel_id)) {
        await db.query('ROLLBACK');
        return res.status(403).json({ 
          error: 'Access Denied: Wardens can only record payments for students in their own hostel.' 
        });
      }
    }

    const feesToPayRes = await db.query(`
      SELECT * FROM fees 
      WHERE student_id = $1 AND status != 'paid'
      ORDER BY 
        CASE WHEN fee_type = 'remaining' THEN 2 ELSE 1 END,
        due_date ASC, 
        fee_id ASC
    `, [studentId]);

    let feesToPay = feesToPayRes.rows;
    let receipts = [];

    // 2. Record the BANK TRANSACTION once (The single source of truth for the ID)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const mainReceiptId = `H${student.hostel_id}-S${studentId}-${dateStr}-${randomSuffix}`;
    const firstFeeId = feesToPay.length > 0 ? feesToPay[0].fee_id : null;

    const paymentRes = await db.query(`
      INSERT INTO payments (student_id, hostel_id, fee_id, amount, payment_method, transaction_id, receipt_id, actual_payment_date, remarks, status, public_token, collector_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, gen_random_uuid(), $11)
      RETURNING payment_id, public_token
    `, [studentId, student.hostel_id, firstFeeId, raw_amount_paid, payment_method, transaction_id, mainReceiptId, paymentDate, remarks, 'completed', req.user.id]);
    
    const mainPaymentId = paymentRes.rows[0].payment_id;
    const mainPublicToken = paymentRes.rows[0].public_token;
    receipts.push({ receipt_id: mainReceiptId, public_token: mainPublicToken });

    // 3. Allocate the money to fees
    let remainingToAllocate = raw_amount_paid;
    let firstFeeProcessed = false;
    for (let fee of feesToPay) {
      if (remainingToAllocate <= 0) break;

      const currentRequired = (parseFloat(fee.amount) || 0) + (parseFloat(fee.adjustment_amount) || 0) - (parseFloat(fee.paid_amount) || 0);
      
      if (!firstFeeProcessed) {
        // How much of the CURRENT payment can we actually apply to THIS installment?
        // It's either the whole payment OR just enough to clear the installment.
        const amountActuallyApplied = Math.min(remainingToAllocate, Math.max(0, currentRequired));
        const balance = currentRequired - amountActuallyApplied;
        const newStatus = balance <= 0 ? 'paid' : 'partial';

        let spilloverAmount = remainingToAllocate - amountActuallyApplied;
        let breakdownRemark = remarks || '';
        
        if (spilloverAmount > 0) {
          breakdownRemark = `${remarks || ''} | ₹${amountActuallyApplied.toFixed(2)} applied to ${fee.installment_name || fee.month} | ₹${spilloverAmount.toFixed(2)} adjusted to future installments`;
        }

        // Update the main fee row (the target of the current direct payment)
        // We now store the FULL payment amount in the first row's paid_amount 
        // to show "Total Received" in the UI, but logically it's still capped for balance.
        // We APPEND to remarks instead of overwriting to preserve adjustment history.
        await db.query(`
          UPDATE fees SET 
            status = $1, 
            paid_amount = COALESCE(paid_amount, 0) + $2, 
            payment_date = $3, 
            payment_method = $4, 
            transaction_id = $5, 
            receipt_id = $6,
            remarks = CASE 
              WHEN remarks IS NULL OR remarks = '' THEN $7
              ELSE remarks || ' | ' || $7
            END,
            advance_balance = CASE WHEN fee_type = 'advance_payment' THEN COALESCE(paid_amount, 0) + $2 ELSE advance_balance END,
            security_balance = CASE WHEN fee_type = 'advance_payment' THEN COALESCE(paid_amount, 0) + $2 ELSE security_balance END,
            remaining_security = CASE WHEN fee_type = 'advance_payment' THEN COALESCE(paid_amount, 0) + $2 ELSE remaining_security END
          WHERE fee_id = $8
        `, [newStatus, remainingToAllocate, paymentDate, payment_method, transaction_id, mainReceiptId, breakdownRemark, fee.fee_id]);

        // If this was a security deposit payment, update the student's security_balance
        const isSecurityRow = fee.fee_type === 'advance_payment' || (fee.installment_name && fee.installment_name.includes('Security Deposit'));
        if (isSecurityRow) {
          await db.query(`
            UPDATE students SET security_balance = COALESCE(security_balance, 0) + $1 WHERE student_id = $2
          `, [remainingToAllocate, studentId]);
        }

        // Update Ledger
        await db.query(`
          INSERT INTO fee_ledger (student_id, hostel_id, transaction_type, amount, balance_after, reference_id, description)
          VALUES ($1, $2, 'Payment', $3, $4, $5, $6)
        `, [studentId, student.hostel_id, amountActuallyApplied, Math.max(0, balance), mainPaymentId, `Payment for ${fee.installment_name || fee.month}`]);

        // HANDLE SPILLOVER (Adjust future dues without marking them as "paid directly")
        if (spilloverAmount > 0) {
          let remainingSpillover = spilloverAmount;
          const futureFeesRes = await db.query(`
            SELECT fee_id, installment_name, month, amount, adjustment_amount, paid_amount FROM fees 
            WHERE student_id = $1 AND status != 'paid' AND fee_id != $2
            ORDER BY CASE WHEN fee_type = 'remaining' THEN 2 ELSE 1 END, due_date ASC, fee_id ASC
          `, [studentId, fee.fee_id]);

          for (let futureFee of futureFeesRes.rows) {
            if (remainingSpillover <= 0) break;
            
            // Calculate actual requirement for this future fee
            const currentReq = parseFloat(futureFee.amount) + parseFloat(futureFee.adjustment_amount || 0) - parseFloat(futureFee.paid_amount || 0);
            
            if (currentReq <= 0) continue; // Already covered by previous adjustments

            const adjustNow = Math.min(remainingSpillover, currentReq);
            
            if (adjustNow > 0) {
              const sourceLabel = fee.installment_name || fee.month || 'PREVIOUS';
              const adjRemark = `₹${adjustNow.toFixed(2)} ADJUSTED FROM ${sourceLabel}`;
              
              // If this adjustment fully covers the fee, mark it as 'paid' but keep paid_amount as 0 (it's an internal adjustment)
              const isNowCovered = (currentReq - adjustNow) <= 0;
              const futureStatusUpdate = isNowCovered ? ", status = 'paid'" : "";

              // CRITICAL: If spillover comes from security, flag the adjusted row so sync logic counts it
              const paymentSourceUpdate = isSecurityRow ? ", payment_source = 'ADVANCE_ADJUSTED', adjusted_from_advance = TRUE" : "";

              await db.query(`
                UPDATE fees SET 
                  adjustment_amount = COALESCE(adjustment_amount, 0) - $1,
                  remarks = CASE 
                    WHEN remarks IS NULL OR remarks = '' THEN $2
                    ELSE remarks || ' | ' || $2
                  END,
                  transaction_id = $3,
                  receipt_id = $4
                  ${paymentSourceUpdate}
                  ${futureStatusUpdate}
                WHERE fee_id = $5
              `, [adjustNow, adjRemark, transaction_id, mainReceiptId, futureFee.fee_id]);
              
              remainingSpillover -= adjustNow;
            }
          }
          remainingToAllocate = remainingSpillover;
        } else {
          remainingToAllocate = 0; 
        }
        
        firstFeeProcessed = true;
      }
    }

    // 4. Handle Overpayment Credit (If money is left after ALL installments are fully cleared)
    if (remainingToAllocate > 0) {
      const today = new Date();
      const monthLabel = today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      const overpaymentReceiptId = `${mainReceiptId}-EX`;

      await db.query(`
        INSERT INTO fees (student_id, hostel_id, amount, status, due_date, fee_type, installment_name, period_start, month, remarks, paid_amount, payment_date, payment_method, transaction_id, receipt_id)
        VALUES ($1, $2, 0, 'paid', $3, 'remaining', 'Overpayment Credit', $3, $4, $5, $6, $3, $7, $8, $9)
      `, [studentId, student.hostel_id, today, monthLabel, 'Excess payment credited', remainingToAllocate, payment_method, transaction_id, overpaymentReceiptId]);

      await db.query(`
        INSERT INTO fee_ledger (student_id, hostel_id, transaction_type, amount, balance_after, reference_id, description)
        VALUES ($1, $2, 'Payment', $3, 0, $4, 'Excess payment credited')
      `, [studentId, student.hostel_id, remainingToAllocate, mainPaymentId]);
    }

    await db.query('COMMIT');
    
    try {
      await logAction(req.user.role, req.user.id, `Recorded total payment of ₹${amount_paid} for student ${student.name || studentId}`, 'fee');
    } catch (logErr) {
      console.error('LogAction failure:', logErr);
    }

    res.json({ message: 'Payment recorded successfully', receipt_ids: receipts });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Transaction FAILED:', err);
    
    // Check for specific database errors
    if (err.code === '23505') {
      const detail = err.detail || "";
      if (detail.includes('transaction_id')) {
        return res.status(400).json({ error: 'This Transaction ID has already been used. Please enter a unique ID.' });
      }
      if (detail.includes('receipt_id')) {
        return res.status(400).json({ error: 'Receipt ID collision. Please try again.' });
      }
      return res.status(400).json({ error: 'Duplicate record detected: ' + detail });
    }
    
    res.status(500).json({ error: `DB ERROR: ${err.message}` });
  }
});

// 3. Get Revenue Stats for Warden Dashboard
router.get('/stats/:hostelId', authenticateToken, async (req, res) => {
  try {
    const hostelId = parseInt(req.params.hostelId);
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [hostelId];
    if (startDate && endDate) {
      dateFilter = ' AND actual_payment_date BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    }

    const stats = await db.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_collected,
        COUNT(DISTINCT student_id) as students_paid
      FROM payments
      WHERE hostel_id = $1 AND status = 'completed' ${dateFilter}
    `, params);

    const overdue = await db.query(`
      SELECT COUNT(*) as overdue_count
      FROM fees
      WHERE hostel_id = $1 AND status != 'paid' AND due_date < CURRENT_DATE
    `, [hostelId]);

    res.json({
      collected: stats.rows[0].total_collected,
      studentsPaid: stats.rows[0].students_paid,
      overdueCount: overdue.rows[0].overdue_count
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching stats' });
  }
});

// 4. Get Due Alerts for Warden Dashboard
router.get('/due-alerts/:hostelId', authenticateToken, async (req, res) => {
  try {
    const hostelId = parseInt(req.params.hostelId);
    const today = new Date();
    
    const resDue = await db.query(`
      SELECT 
        s.student_id,
        s.name, 
        s.room_id,
        r.room_number, 
        s.payment_model, 
        SUM(f.amount + COALESCE(f.adjustment_amount, 0) - COALESCE(f.paid_amount, 0)) as total_due
      FROM fees f
      JOIN students s ON f.student_id = s.student_id
      LEFT JOIN rooms r ON s.room_id = r.room_id
      WHERE f.hostel_id = $1 
        AND f.status != 'paid' 
        AND f.due_date < CURRENT_DATE
      GROUP BY s.student_id, s.name, s.room_id, r.room_number, s.payment_model
      HAVING SUM(f.amount + COALESCE(f.adjustment_amount, 0) - COALESCE(f.paid_amount, 0)) > 0
      ORDER BY total_due DESC
    `, [hostelId]);

    // Now, for each room, assign seat labels (A, B, C, ...) to students
    const roomStudentsMap = {};
    
    // Group students by room_id
    resDue.rows.forEach(student => {
      if (!roomStudentsMap[student.room_id]) {
        roomStudentsMap[student.room_id] = [];
      }
      roomStudentsMap[student.room_id].push(student);
    });
    
    // For each room, sort students by student_id and assign seat labels
    const formattedAlerts = resDue.rows.map(row => {
      const roomStudents = roomStudentsMap[row.room_id];
      // Sort room's students by student_id to get consistent order
      roomStudents.sort((a, b) => a.student_id - b.student_id);
      const index = roomStudents.findIndex(s => s.student_id === row.student_id);
      const seatLabel = String.fromCharCode(65 + index); // 65 = 'A'
      
      return {
        student_id: row.student_id,
        name: row.name,
        room_number: row.room_number,
        seat_label: seatLabel,
        payment_model: row.payment_model,
        total_due: parseFloat(row.total_due),
        status: 'Overdue'
      };
    });

    res.json(formattedAlerts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 5. Mark Legal Notice as Sent
router.post('/fee/:feeId/notice-sent', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  try {
    const feeId = parseInt(req.params.feeId);

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const feeRes = await db.query('SELECT hostel_id FROM fees WHERE fee_id = $1', [feeId]);
      if (feeRes.rows.length === 0) return res.status(404).json({ error: 'Fee record not found' });
      
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(feeRes.rows[0].hostel_id)) {
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    await db.query(`
      UPDATE fees 
      SET notice_sent = TRUE, notice_sent_at = CURRENT_TIMESTAMP 
      WHERE fee_id = $1
    `, [feeId]);
    
    await logAction(req.user.role, req.user.id, `Sent legal notice for fee ID: ${feeId}`, 'fee');
    res.json({ message: 'Notice status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating notice status' });
  }
});

// 6. Adjust Advance Payment (2+1 System Only)
router.post('/student/:studentId/adjust-advance', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  const studentId = parseInt(req.params.studentId);
  try {
    await db.query('BEGIN');

    // 1. Verify student is on 2+1 system and has advance payments
    const studentRes = await db.query('SELECT payment_model, total_months_stay, hostel_id FROM students WHERE student_id = $1', [studentId]);
    if (studentRes.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Student record not found' });
    }
    const student = studentRes.rows[0];

    if (student.payment_model !== '2 + 1 System') {
      await db.query('ROLLBACK');
      return res.status(400).json({ error: 'Adjustment only applicable for 2 + 1 System' });
    }

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(student.hostel_id)) {
        await db.query('ROLLBACK');
        return res.status(403).json({ 
          error: 'Access Denied: Wardens can only adjust advance for students in their own hostel.' 
        });
      }
    }

    const advanceFeesRes = await db.query(`
      SELECT * FROM fees 
      WHERE student_id = $1 AND fee_type = 'advance_payment' AND status = 'paid' AND advance_status = 'unadjusted'
      ORDER BY fee_id ASC
    `, [studentId]);

    if (advanceFeesRes.rows.length < 2) {
      await db.query('ROLLBACK');
      return res.status(400).json({ error: 'Full 2-month advance must be paid before adjustment.' });
    }

    const totalAdvancePool = advanceFeesRes.rows.reduce((sum, f) => sum + parseFloat(f.paid_amount || 0), 0);
    let remainingPool = totalAdvancePool;

    // 2. Identify Gaps and Last Months
    const allMonthlyFeesRes = await db.query(`
      SELECT * FROM fees 
      WHERE student_id = $1 AND fee_type = 'monthly'
      ORDER BY period_start ASC
    `, [studentId]);

    const monthlyFees = allMonthlyFeesRes.rows;
    
    // 3. Chronological Gap Filling
    const timestamp = new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
    const auditNote = `[${timestamp}] Adjusted from Advance Pool (Warden)`;

    for (let fee of monthlyFees) {
      if (remainingPool <= 0) break;
      if (fee.status === 'paid') continue;

      const required = parseFloat(fee.amount) + parseFloat(fee.adjustment_amount || 0) - parseFloat(fee.paid_amount || 0);
      const adjustAmount = Math.min(remainingPool, required);

      if (adjustAmount > 0) {
        await db.query(`
          UPDATE fees SET 
            status = CASE WHEN ($1 >= $2) THEN 'paid' ELSE 'partial' END,
            adjustment_amount = COALESCE(adjustment_amount, 0) - $1,
            remarks = CASE 
              WHEN remarks IS NULL OR remarks = '' THEN $3
              ELSE remarks || ' | ' || $3
            END,
            payment_date = CURRENT_DATE,
            payment_source = 'ADVANCE_ADJUSTED',
            adjusted_from_advance = TRUE
          WHERE fee_id = $4
        `, [adjustAmount, required, auditNote, fee.fee_id]);
        
        remainingPool -= adjustAmount;
      }
    }

    // 4. Mark Advance Rows as Adjusted and track remaining balance
    await db.query(`
      UPDATE fees SET 
        advance_status = 'adjusted',
        advance_balance = $1,
        security_balance = $1,
        remaining_security = $1
      WHERE student_id = $2 AND fee_type = 'advance_payment'
    `, [remainingPool, studentId]);

    await db.query('COMMIT');
    res.json({ message: 'Advance adjustment successful' });
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// 7. Unadjust Advance Payment
router.post('/student/:studentId/unadjust-advance', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  const studentId = parseInt(req.params.studentId);
  try {
    await db.query('BEGIN');

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const studentRes = await db.query('SELECT hostel_id FROM students WHERE student_id = $1', [studentId]);
      if (studentRes.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({ error: 'Student record not found' });
      }
      
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(studentRes.rows[0].hostel_id)) {
        await db.query('ROLLBACK');
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    // Reset Monthly Rows that were adjusted
    await db.query(`
      UPDATE fees SET 
        status = 'unpaid',
        adjustment_amount = 0,
        remarks = REPLACE(remarks, ' | Adjusted from Advance Pool', ''),
        payment_date = NULL,
        payment_source = 'DIRECT',
        adjusted_from_advance = FALSE
      WHERE student_id = $1 AND fee_type = 'monthly' AND adjusted_from_advance = TRUE
    `, [studentId]);

    // Reset Advance Rows status and balance
    await db.query(`
      UPDATE fees SET 
        advance_status = 'unadjusted',
        advance_balance = amount,
        security_balance = amount,
        remaining_security = amount
      WHERE student_id = $1 AND fee_type = 'advance_payment'
    `, [studentId]);

    await db.query('COMMIT');
    res.json({ message: 'Adjustment reversed successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// 8. Settle Account & Final Adjustment (2+1 System Only)
router.post('/student/:studentId/settle-account', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  const studentId = parseInt(req.params.studentId);
  const { exitDate } = req.body;
  
  try {
    await db.query('BEGIN');

    // 1. Fetch Student & Current Advance
    const studentRes = await db.query('SELECT payment_model, monthly_fee::float, status, hostel_id FROM students WHERE student_id = $1', [studentId]);
    if (studentRes.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Student record not found' });
    }
    const student = studentRes.rows[0];

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(student.hostel_id)) {
        await db.query('ROLLBACK');
        return res.status(403).json({ 
          error: 'Access Denied: Wardens can only settle accounts for students in their own hostel.' 
        });
      }
    }

    if (student.payment_model !== '2 + 1 System') {
      await db.query('ROLLBACK');
      return res.status(400).json({ error: 'Settlement logic only applicable for 2 + 1 System' });
    }

    const advanceFeesRes = await db.query(`
      SELECT * FROM fees 
      WHERE student_id = $1 AND fee_type = 'advance_payment' AND status = 'paid'
    `, [studentId]);

    const totalAdvancePool = advanceFeesRes.rows.reduce((sum, f) => sum + parseFloat(f.paid_amount || 0), 0);
    let remainingPool = totalAdvancePool;

    // 2. Identify all unpaid/partial monthly fees
    const monthlyFeesRes = await db.query(`
      SELECT * FROM fees 
      WHERE student_id = $1 AND fee_type = 'monthly' AND status != 'paid'
      ORDER BY period_start ASC
    `, [studentId]);

    const exitDateObj = new Date(exitDate);
    
    // 3. Pro-Rata Adjustment for the Exit Month
    for (let fee of monthlyFeesRes.rows) {
      if (remainingPool <= 0) break;

      const periodStart = new Date(fee.period_start);
      const periodEnd = new Date(fee.period_end || getNextMonthDate(periodStart));
      
      let requiredAmount = parseFloat(fee.amount) + parseFloat(fee.adjustment_amount || 0) - parseFloat(fee.paid_amount || 0);

      // Check if exit date falls within this month's period
      if (exitDateObj >= periodStart && exitDateObj <= periodEnd) {
        const totalDaysInMonth = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
        const daysStayed = Math.ceil((exitDateObj - periodStart) / (1000 * 60 * 60 * 24)) + 1;
        const proRataRent = (student.monthly_fee / totalDaysInMonth) * daysStayed;
        requiredAmount = Math.max(0, proRataRent - parseFloat(fee.paid_amount || 0));
        
        await db.query(`
          UPDATE fees SET 
            amount = $1,
            remarks = COALESCE(remarks, '') || ' | Pro-rata settlement for early exit'
          WHERE fee_id = $2
        `, [proRataRent, fee.fee_id]);
      } else if (exitDateObj < periodStart) {
        // Future month after exit: amount should be 0 if we are settling
        requiredAmount = 0;
        await db.query(`UPDATE fees SET amount = 0, status = 'paid', remarks = 'Settled - Not Stayed' WHERE fee_id = $1`, [fee.fee_id]);
        continue;
      }

      const adjustAmount = Math.min(remainingPool, requiredAmount);

      if (adjustAmount > 0) {
        await db.query(`
          UPDATE fees SET 
            status = CASE WHEN ($1 >= $2) THEN 'paid' ELSE 'partial' END,
            adjustment_amount = COALESCE(adjustment_amount, 0) - $1,
            payment_date = CURRENT_DATE,
            payment_source = 'ADVANCE_ADJUSTED',
            adjusted_from_advance = TRUE,
            remarks = COALESCE(remarks, '') || ' | Account Settled'
          WHERE fee_id = $3
        `, [adjustAmount, requiredAmount, fee.fee_id]);
        
        remainingPool -= adjustAmount;
      }
    }

    // 4. Update Student Status to Exited
    await db.query('UPDATE students SET status = \'Exited\' WHERE student_id = $1', [studentId]);

    // 5. Finalize Advance Rows
    await db.query(`
      UPDATE fees SET 
        advance_status = 'adjusted',
        advance_balance = $1,
        security_balance = $1,
        remaining_security = $1
      WHERE student_id = $2 AND fee_type = 'advance_payment'
    `, [remainingPool, studentId]);

    // Update student's security_balance to the remaining pool
    await db.query(`UPDATE students SET security_balance = $1 WHERE student_id = $2`, [remainingPool, studentId]);

    await db.query('COMMIT');
    res.json({ message: 'Account settled successfully', remaining_refund: remainingPool });
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// 9. Manual Adjustment from Security Deposit (2+1 System Only)
router.post('/fee/:feeId/adjust-security', authenticateToken, authorizeRoles('warden', 'admin'), async (req, res) => {
  const feeId = parseInt(req.params.feeId);
  const { adjustAmount } = req.body;
  const rawAdjustAmount = parseFloat(adjustAmount) || 0;

  if (rawAdjustAmount <= 0) return res.status(400).json({ error: 'Adjustment amount must be greater than zero.' });

  try {
    await db.query('BEGIN');

    // 1. Fetch the target fee and student
    const feeRes = await db.query('SELECT * FROM fees WHERE fee_id = $1', [feeId]);
    if (feeRes.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Fee record not found' });
    }
    const fee = feeRes.rows[0];

    // --- WARDEN-HOSTEL VALIDATION ---
    if (req.user.role === 'warden') {
      const wardenRes = await db.query('SELECT hostel_id FROM hostels WHERE warden_id = $1', [req.user.id]);
      const wardenHostels = wardenRes.rows.map(h => h.hostel_id);
      
      if (!wardenHostels.includes(fee.hostel_id)) {
        await db.query('ROLLBACK');
        return res.status(403).json({ error: 'Access Denied: You are not assigned to this hostel.' });
      }
    }

    // 2. Fetch the student's security deposit balance
    const studentRes = await db.query('SELECT security_balance FROM students WHERE student_id = $1', [fee.student_id]);
    const currentBalance = parseFloat(studentRes.rows[0]?.security_balance || 0);
    
    console.log(`[DEBUG] Adjusting fee ${feeId} for student ${fee.student_id}. Current Security Balance: ₹${currentBalance}, Requested: ₹${rawAdjustAmount}`);

    if (currentBalance < rawAdjustAmount) {
      await db.query('ROLLBACK');
      return res.status(400).json({ error: `Insufficient security funds. Available: ₹${currentBalance.toLocaleString()}` });
    }

    // 3. Apply adjustment to the monthly fee
    const currentRequired = parseFloat(fee.amount) + parseFloat(fee.adjustment_amount || 0) - parseFloat(fee.paid_amount || 0);
    const newAdjustment = (parseFloat(fee.adjustment_amount || 0)) - rawAdjustAmount;
    const isNowPaid = (currentRequired - rawAdjustAmount) <= 0;

    const timestamp = new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
    const auditNote = `[${timestamp}] Adjusted ₹${rawAdjustAmount.toLocaleString()} from Security Deposit (Warden)`;

    await db.query(`
      UPDATE fees SET 
        status = $1,
        adjustment_amount = $2,
        payment_source = 'SECURITY',
        adjusted_from_advance = TRUE,
        payment_date = CURRENT_DATE,
        remarks = CASE 
          WHEN remarks IS NULL OR remarks = '' THEN $3
          ELSE remarks || ' | ' || $3
        END
      WHERE fee_id = $4
    `, [isNowPaid ? 'paid' : 'partial', newAdjustment, auditNote, feeId]);

    // 4. Deduct from student security_balance and sync fee rows
    await db.query(`UPDATE students SET security_balance = security_balance - $1 WHERE student_id = $2`, [rawAdjustAmount, fee.student_id]);

    // Also sync the individual fee rows for display in "Advance Pool"
    const allSecRows = await db.query(`
      SELECT fee_id, advance_balance, amount, status, adjusted_from_advance FROM fees 
      WHERE student_id = $1 
      AND (fee_type = 'advance_payment' OR installment_name ILIKE '%Security Deposit%') 
      AND status = 'paid'
      ORDER BY fee_id ASC
    `, [fee.student_id]);

    let remainingToDeduct = rawAdjustAmount;
    for (let secRow of allSecRows.rows) {
      if (remainingToDeduct <= 0) break;
      let rowBal = parseFloat(secRow.advance_balance || 0);
      
      // Fallback for older rows that have amount but 0 advance_balance
      if (rowBal === 0 && !secRow.adjusted_from_advance) {
        rowBal = parseFloat(secRow.amount || 0);
      }

      const deductNow = Math.min(remainingToDeduct, rowBal);
      const newRowBal = rowBal - deductNow;

      await db.query(`
        UPDATE fees SET 
          advance_balance = $1,
          security_balance = $1,
          remaining_security = $1,
          advance_status = 'adjusted'
        WHERE fee_id = $2
      `, [newRowBal, secRow.fee_id]);
      remainingToDeduct -= deductNow;
    }

    // 5. Update Ledger
    await db.query(`
      INSERT INTO fee_ledger (student_id, hostel_id, transaction_type, amount, balance_after, description)
      VALUES ($1, $2, 'Adjustment', $3, $4, $5)
    `, [fee.student_id, fee.hostel_id, rawAdjustAmount, Math.max(0, currentRequired - rawAdjustAmount), `Security adjustment for ${fee.month || fee.installment_name}`]);

    await db.query('COMMIT');
    res.json({ message: 'Security adjustment successful' });
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// --- PUBLIC RECEIPT ENDPOINT ---
// No authentication required. Securely fetches receipt data using a UUID token.
router.get('/public/receipt/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Validate UUID format to prevent DB error
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return res.status(400).json({ error: 'Invalid receipt token format' });
    }

    // Search in payments table first
    let mainRecordRes = await db.query(`
      SELECT 
        p.amount as paid_amount,
        p.payment_method,
        p.actual_payment_date as payment_date,
        p.transaction_id,
        p.receipt_id,
        p.remarks,
        p.student_id,
        s.name as student_name,
        s.payment_model,
        s.monthly_fee,
        s.security_deposit,
        s.security_balance,
        s.total_session_fees,
        s.joining_date,
        COALESCE(s.details->>'assigned_slot', r.room_number) as room_number,
        s.phone,
        h.hostel_name as hostel_name,
        h.address as hostel_address,
        h.contact as hostel_contact,
        f.installment_name,
        f.month
      FROM payments p
      JOIN students s ON p.student_id = s.student_id
      JOIN hostels h ON p.hostel_id = h.hostel_id
      LEFT JOIN rooms r ON s.room_id = r.room_id
      LEFT JOIN fees f ON p.fee_id = f.fee_id
      WHERE p.public_token = $1
    `, [token]);

    // If not found in payments, check fees table (for legacy or direct fee records)
    if (mainRecordRes.rows.length === 0) {
      mainRecordRes = await db.query(`
        SELECT 
          f.paid_amount,
          f.payment_method,
          f.payment_date,
          f.transaction_id,
          f.receipt_id,
          f.remarks,
          f.student_id,
          s.name as student_name,
          s.payment_model,
          s.monthly_fee,
          s.security_deposit,
          s.security_balance,
          s.total_session_fees,
          s.joining_date,
          COALESCE(s.details->>'assigned_slot', r.room_number) as room_number,
          s.phone,
          h.hostel_name as hostel_name,
          h.address as hostel_address,
          h.contact as hostel_contact,
          f.installment_name,
          f.month
        FROM fees f
        JOIN students s ON f.student_id = s.student_id
        JOIN hostels h ON f.hostel_id = h.hostel_id
        LEFT JOIN rooms r ON s.room_id = r.room_id
        WHERE f.public_token = $1 AND f.status = 'paid'
      `, [token]);
    }

    if (mainRecordRes.rows.length > 0) {
      const receipt = mainRecordRes.rows[0];
      const studentId = receipt.student_id;

      // Calculate overall stats for this student (same logic as Warden Portal)
      const feesRes = await db.query(`
        SELECT fee_id, installment_name, paid_amount 
        FROM fees 
        WHERE student_id = $1
      `, [studentId]);
      
      const fees = feesRes.rows;

      const totalPaid = fees.reduce((sum, f) => sum + parseFloat(f.paid_amount || "0"), 0);
      const overcreditedAmount = fees.reduce((sum, f) => {
        if (f.installment_name === 'Overpayment Credit') {
          return sum + parseFloat(f.paid_amount || "0");
        }
        return sum;
      }, 0);
      
      const totalSession = parseFloat(receipt.total_session_fees || "0");
      const totalDue = Math.max(0, totalSession - (totalPaid - overcreditedAmount));

      return res.json({
        ...receipt,
        stats: {
          totalPaid,
          totalDue,
          overcreditedAmount
        }
      });
    }

    res.status(404).json({ error: 'Receipt not found' });
  } catch (err) {
    console.error('Public receipt fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;