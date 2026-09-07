const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');

router.use(authenticateToken);

// ----------------- LEADS CRUD -----------------

// Get all leads (with filters)
router.get('/', async (req, res) => {
    try {
        let query = `
            SELECT l.*, u.name as assigned_employee_name
            FROM leads l
            LEFT JOIN users u ON l.assigned_employee_id = u.id
            WHERE 1=1
        `;
        const params = [];

        // Admin sees all, Sales sees only assigned
        if (req.user.role === 'SALES_EMPLOYEE') {
            query += ' AND l.assigned_employee_id = ?';
            params.push(req.user.id);
        }

        if (req.query.stage) {
            query += ' AND l.stage = ?';
            params.push(req.query.stage);
        }
        if (req.query.source) {
            query += ' AND l.lead_source = ?';
            params.push(req.query.source);
        }
        if (req.query.search) {
            query += ' AND (l.customer_name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.lead_code LIKE ?)';
            const searchPattern = `%${req.query.search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        query += ' ORDER BY l.created_at DESC';

        const [rows] = await db.query(query, params);
        res.json({ success: true, leads: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Check for duplicate leads
router.post('/check-duplicate', async (req, res) => {
    try {
        const { phone, email } = req.body;
        if (!phone && !email) {
            return res.json({ success: true, isDuplicate: false });
        }

        let query = 'SELECT id, lead_code, customer_name, phone, email FROM leads WHERE ';
        const conditions = [];
        const params = [];

        if (phone) {
            conditions.push('phone = ?');
            params.push(phone);
        }
        if (email) {
            conditions.push('email = ?');
            params.push(email);
        }

        query += conditions.join(' OR ');

        const [rows] = await db.query(query, params);
        if (rows.length > 0) {
            res.json({ success: true, isDuplicate: true, duplicate: rows[0] });
        } else {
            res.json({ success: true, isDuplicate: false });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get single lead
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT l.*, u.name as assigned_employee_name 
            FROM leads l 
            LEFT JOIN users u ON l.assigned_employee_id = u.id 
            WHERE l.id = ?
        `, [req.params.id]);

        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Lead not found' });

        const lead = rows[0];
        if (req.user.role === 'SALES_EMPLOYEE' && lead.assigned_employee_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this lead' });
        }

        res.json({ success: true, lead });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Create lead
router.post('/', async (req, res) => {
    try {
        const { customer_name, phone, email, lead_source, requirement, budget, assigned_employee_id } = req.body;
        
        if (!customer_name || !phone) {
            return res.status(400).json({ success: false, message: 'Customer name and phone are required' });
        }

        // Generate a random lead code
        const lead_code = 'LD-' + Math.floor(10000 + Math.random() * 90000);
        const assignedId = req.user.role === 'ADMIN' ? (assigned_employee_id || req.user.id) : req.user.id;

        const [result] = await db.query(`
            INSERT INTO leads (lead_code, customer_name, phone, email, lead_source, requirement, budget, assigned_employee_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [lead_code, customer_name, phone, email || null, lead_source || null, requirement || null, budget || null, assignedId]);

        res.json({ success: true, message: 'Lead created successfully', lead_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update lead
router.put('/:id', async (req, res) => {
    try {
        const { customer_name, phone, email, lead_source, requirement, budget, stage, assigned_employee_id } = req.body;
        
        const [leadRows] = await db.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
        if (leadRows.length === 0) return res.status(404).json({ success: false, message: 'Lead not found' });

        if (req.user.role === 'SALES_EMPLOYEE' && leadRows[0].assigned_employee_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to modify this lead' });
        }

        const updates = [];
        const params = [];

        if (customer_name) { updates.push('customer_name = ?'); params.push(customer_name); }
        if (phone) { updates.push('phone = ?'); params.push(phone); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }
        if (lead_source) { updates.push('lead_source = ?'); params.push(lead_source); }
        if (requirement !== undefined) { updates.push('requirement = ?'); params.push(requirement); }
        if (budget !== undefined) { updates.push('budget = ?'); params.push(budget); }
        if (stage) { updates.push('stage = ?'); params.push(stage); }
        if (assigned_employee_id && req.user.role === 'ADMIN') { 
            updates.push('assigned_employee_id = ?'); params.push(assigned_employee_id); 
        }

        if (updates.length === 0) return res.json({ success: true, message: 'No changes made' });

        params.push(req.params.id);
        await db.query(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, params);

        res.json({ success: true, message: 'Lead updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// ----------------- LEAD ACTIVITIES -----------------

// Get activities for lead
router.get('/:id/activities', async (req, res) => {
    try {
        // Auto-update overdue statuses before fetching
        await db.query(`
            UPDATE lead_activities 
            SET status = 'Overdue' 
            WHERE status = 'Scheduled' AND activity_date < NOW()
        `);

        const [rows] = await db.query(`
            SELECT la.*, u.name as created_by_name
            FROM lead_activities la
            LEFT JOIN users u ON la.created_by = u.id
            WHERE la.lead_id = ?
            ORDER BY la.activity_date DESC
        `, [req.params.id]);

        res.json({ success: true, activities: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Create activity
router.post('/:id/activities', async (req, res) => {
    try {
        const { activity_type, activity_date, notes } = req.body;
        if (!activity_type || !activity_date) {
            return res.status(400).json({ success: false, message: 'Type and date are required' });
        }

        const [result] = await db.query(`
            INSERT INTO lead_activities (lead_id, activity_type, activity_date, notes, created_by)
            VALUES (?, ?, ?, ?, ?)
        `, [req.params.id, activity_type, activity_date, notes || null, req.user.id]);

        res.json({ success: true, message: 'Activity scheduled successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update activity status
router.put('/activities/:activityId', async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

        let query = 'UPDATE lead_activities SET status = ?';
        const params = [status];

        if (status === 'Completed') {
            query += ', completed_at = NOW()';
        }

        query += ' WHERE id = ?';
        params.push(req.params.activityId);

        await db.query(query, params);
        res.json({ success: true, message: 'Activity updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
