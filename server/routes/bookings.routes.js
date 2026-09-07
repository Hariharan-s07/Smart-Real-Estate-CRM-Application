const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');

router.use(authenticateToken);

// Get all bookings
router.get('/', async (req, res) => {
    try {
        let query = `
            SELECT b.*, l.customer_name, u.unit_number, u.building_id, 
                   bd.building_name, p.project_name, usr.name as sales_person
            FROM bookings b
            JOIN leads l ON b.lead_id = l.id
            JOIN units u ON b.unit_id = u.id
            JOIN buildings bd ON u.building_id = bd.id
            JOIN projects p ON bd.project_id = p.id
            JOIN users usr ON b.sales_employee_id = usr.id
            WHERE 1=1
        `;
        const params = [];

        if (req.user.role === 'SALES_EMPLOYEE') {
            query += ' AND b.sales_employee_id = ?';
            params.push(req.user.id);
        }

        query += ' ORDER BY b.created_at DESC';

        const [rows] = await db.query(query, params);
        res.json({ success: true, bookings: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// IMPORTANT: Double Booking Prevention
router.post('/', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { lead_id, unit_id, price } = req.body;
        if (!lead_id || !unit_id || !price) {
            return res.status(400).json({ success: false, message: 'Lead, unit, and price are required' });
        }

        await connection.beginTransaction();

        // Check if lead belongs to the sales employee (if they are not admin)
        if (req.user.role === 'SALES_EMPLOYEE') {
            const [leadCheck] = await connection.query('SELECT assigned_employee_id FROM leads WHERE id = ?', [lead_id]);
            if (leadCheck.length === 0 || leadCheck[0].assigned_employee_id !== req.user.id) {
                await connection.rollback();
                return res.status(403).json({ success: false, message: 'Not authorized to book for this lead' });
            }
        }

        // Lock the unit row for update to prevent double bookings
        const [units] = await connection.query('SELECT status FROM units WHERE id = ? FOR UPDATE', [unit_id]);
        
        if (units.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Unit not found' });
        }

        if (units[0].status !== 'Available') {
            await connection.rollback();
            return res.status(409).json({ success: false, message: 'This unit is no longer available. Please select another unit.' });
        }

        // Generate Booking Code
        const booking_code = 'BK-' + Math.floor(10000 + Math.random() * 90000);

        // Insert booking
        await connection.query(`
            INSERT INTO bookings (booking_code, lead_id, unit_id, sales_employee_id, price, booking_status, booking_date)
            VALUES (?, ?, ?, ?, ?, 'Confirmed', NOW())
        `, [booking_code, lead_id, unit_id, req.user.id, price]);

        // Update unit status
        await connection.query('UPDATE units SET status = "Booked" WHERE id = ?', [unit_id]);
        
        // Update lead stage
        await connection.query('UPDATE leads SET stage = "Booked" WHERE id = ?', [lead_id]);

        await connection.commit();
        res.json({ success: true, message: 'Booking created successfully', booking_code });

    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error during booking' });
    } finally {
        connection.release();
    }
});

// Cancel Booking
router.put('/:id/cancel', requireRole(['ADMIN']), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [booking] = await connection.query('SELECT unit_id, booking_status FROM bookings WHERE id = ? FOR UPDATE', [req.params.id]);
        if (booking.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        if (booking[0].booking_status === 'Cancelled') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Booking is already cancelled' });
        }

        // Mark booking cancelled
        await connection.query('UPDATE bookings SET booking_status = "Cancelled" WHERE id = ?', [req.params.id]);

        // Make unit available again
        await connection.query('UPDATE units SET status = "Available" WHERE id = ?', [booking[0].unit_id]);

        await connection.commit();
        res.json({ success: true, message: 'Booking cancelled successfully' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        connection.release();
    }
});

module.exports = router;
