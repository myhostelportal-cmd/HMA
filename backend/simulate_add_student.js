const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({ 
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hostel_db',
    password: process.env.DB_PASSWORD || 'Apoorv123@',
    port: process.env.DB_PORT || 5432
});

async function simulateAddStudent() {
    const hostelId = 11; // ID 11 is 'Bh'
    const wardenId = 7; // Warden 'Yugal'
    
    // Check if Room 202 exists
    const roomRes = await pool.query('SELECT room_id, room_number FROM rooms WHERE hostel_id = $1', [hostelId]);
    console.log('Available rooms in Hostel 11:', roomRes.rows);
    
    if (roomRes.rows.length === 0) {
        console.error('No rooms found in hostel 11');
        process.exit(1);
    }
    
    const roomId = roomRes.rows[0].room_id; // Use the first available room for simulation
    console.log(`Using Room ID: ${roomId} (Number: ${roomRes.rows[0].room_number})`);

    const name = "abhishek";
    const phone = "8520";
    const details = {
        email: "abhi123@gmail.com",
        whatsapp: "852852",
        aadhaar_student: "7520",
        emergency_contact: "520",
        dob: "12/07/2000",
        gender: "Male",
        joining_date: "10/25/2026",
        address: "qwertyuiop",
        city: "jhgfds",
        state: "gfcxz",
        college: "nbvcxz",
        course: "bvcxz",
        year: "3rd",
        payment_model: "Three Installment System",
        total_session_fees: "160000",
        security_deposit: "15000",
        guardian_name: "ajay",
        guardian_phone: "987421",
        other_contact: "987456321",
        guardian_occupation: "bussiness",
        guardian_aadhaar: "32165498852",
        relation: "Father",
        guardian_address: "fghjk"
    };

    try {
        console.log('--- SIMULATING ADD STUDENT ---');
        await pool.query('BEGIN');

        const paymentModel = details.payment_model || '2 + 1 System';
        const totalSessionFees = parseFloat(details.total_session_fees || 0);
        const totalMonthsStay = parseInt(details.total_months_stay || 10);
        const securityDeposit = parseFloat(details.security_deposit || 0);
        const joiningDate = details.joining_date || new Date().toISOString().split('T')[0];
        const monthlyFee = totalMonthsStay > 0 ? totalSessionFees / totalMonthsStay : 0;

        console.log('Inserting Student with Parameters:', {
            name, phone, hostelId, roomId, wardenId, paymentModel, totalSessionFees, totalMonthsStay, monthlyFee, securityDeposit, joiningDate
        });

        const result = await pool.query(
          `INSERT INTO students (
            name, phone, hostel_id, room_id, status, user_id, details, 
            payment_model, total_session_fees, total_months_stay, monthly_fee, security_deposit, joining_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
          [
            name, 
            phone, 
            hostelId, 
            roomId, 
            'active', 
            wardenId, 
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
        console.log('Student Inserted Successfully. Student ID:', student.student_id);

        // Simulate Fee Generation
        console.log('--- SIMULATING FEE GENERATION ---');
        if (securityDeposit > 0) {
            console.log('Generating Security Deposit Entry...');
            await pool.query(
                `INSERT INTO fees (
                  student_id, hostel_id, amount, status, due_date, fee_type, installment_name, period_start
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [student.student_id, hostelId, securityDeposit, 'pending', joiningDate, 'deposit', 'Security Deposit', joiningDate]
            );
        }

        if (paymentModel === 'Three Installment System') {
            const installments = [
                { name: 'First Installment', perc: 0.4, days: 30 },
                { name: 'Second Installment', perc: 0.3, days: 90 },
                { name: 'Third Installment', perc: 0.3, days: 180 }
            ];

            for (const inst of installments) {
                const amount = totalSessionFees * inst.perc;
                const dueDate = new Date(joiningDate);
                dueDate.setDate(dueDate.getDate() + inst.days);

                let adjustment = 0;
                let remarks = null;
                if (inst.name === 'Third Installment') {
                    adjustment = -parseFloat(securityDeposit);
                    remarks = `₹${securityDeposit} Security Adjusted`;
                }

                console.log(`Generating ${inst.name}: Amount=${amount}, Adjustment=${adjustment}, Due=${dueDate.toISOString()}`);
                await pool.query(
                  `INSERT INTO fees (
                    student_id, hostel_id, amount, status, due_date, fee_type, installment_name, period_start, adjustment_amount, remarks
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                  [student.student_id, hostelId, amount, 'pending', dueDate, 'installment', inst.name, joiningDate, adjustment, remarks]
                );
            }
        }

        console.log('--- ALL SIMULATIONS COMPLETED SUCCESSFULLY ---');
        await pool.query('ROLLBACK'); 
        process.exit(0);
    } catch (err) {
        console.error('--- ERROR DETECTED ---');
        console.error('Code:', err.code);
        console.error('Message:', err.message);
        console.error('Detail:', err.detail);
        await pool.query('ROLLBACK');
        process.exit(1);
    }
}

simulateAddStudent();
