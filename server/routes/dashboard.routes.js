const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

router.get('/summary', async (req, res) => {
    try {
        const isAdmin = req.user.role === 'ADMIN';
        const empId = req.user.id;
        
        const leadFilter = isAdmin ? '' : 'WHERE assigned_employee_id = ?';
        const params = isAdmin ? [] : [empId];

        const [totalLeads] = await db.query(`SELECT COUNT(*) as count FROM leads ${leadFilter}`, params);
        const [newLeads] = await db.query(`SELECT COUNT(*) as count FROM leads WHERE stage = 'New' ${isAdmin ? '' : 'AND assigned_employee_id = ?'}`, params);
        const [siteVisits] = await db.query(`SELECT COUNT(*) as count FROM leads WHERE stage = 'Site Visit' ${isAdmin ? '' : 'AND assigned_employee_id = ?'}`, params);
        const [negotiations] = await db.query(`SELECT COUNT(*) as count FROM leads WHERE stage = 'Negotiation' ${isAdmin ? '' : 'AND assigned_employee_id = ?'}`, params);
        const [bookings] = await db.query(`SELECT COUNT(*) as count FROM leads WHERE stage = 'Booked' ${isAdmin ? '' : 'AND assigned_employee_id = ?'}`, params);
        const [lostLeads] = await db.query(`SELECT COUNT(*) as count FROM leads WHERE stage = 'Lost' ${isAdmin ? '' : 'AND assigned_employee_id = ?'}`, params);

        // Auto update overdue
        await db.query(`UPDATE lead_activities SET status = 'Overdue' WHERE status = 'Scheduled' AND activity_date < NOW()`);

        const [overdue] = await db.query(`
            SELECT COUNT(*) as count FROM lead_activities la
            JOIN leads l ON la.lead_id = l.id
            WHERE la.status = 'Overdue' ${isAdmin ? '' : 'AND l.assigned_employee_id = ?'}
        `, params);

        const [units] = await db.query(`
            SELECT 
                SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available,
                SUM(CASE WHEN status = 'Booked' THEN 1 ELSE 0 END) as booked
            FROM units
        `);

        // Recent Bookings
        const [recentBookings] = await db.query(`
            SELECT b.booking_code, b.booking_date, l.customer_name, u.unit_number, usr.name as sales_person
            FROM bookings b
            JOIN leads l ON b.lead_id = l.id
            JOIN units u ON b.unit_id = u.id
            JOIN users usr ON b.sales_employee_id = usr.id
            ${isAdmin ? '' : 'WHERE b.sales_employee_id = ?'}
            ORDER BY b.created_at DESC LIMIT 5
        `, params);

        // Overdue follow-ups list
        const [recentOverdue] = await db.query(`
            SELECT la.*, l.customer_name 
            FROM lead_activities la
            JOIN leads l ON la.lead_id = l.id
            WHERE la.status = 'Overdue' ${isAdmin ? '' : 'AND l.assigned_employee_id = ?'}
            ORDER BY la.activity_date ASC LIMIT 5
        `, params);

        res.json({
            success: true,
            kpis: {
                totalLeads: totalLeads[0].count,
                newLeads: newLeads[0].count,
                siteVisits: siteVisits[0].count,
                negotiations: negotiations[0].count,
                bookings: bookings[0].count,
                lostLeads: lostLeads[0].count,
                overdueFollowups: overdue[0].count,
                availableUnits: units[0].available || 0,
                bookedUnits: units[0].booked || 0
            },
            recentBookings,
            recentOverdue
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
