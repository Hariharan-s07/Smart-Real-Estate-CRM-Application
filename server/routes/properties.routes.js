const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');

router.use(authenticateToken);

// ----------------- PROJECTS -----------------
router.get('/projects', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM projects ORDER BY project_name');
        res.json({ success: true, projects: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/projects', requireRole(['ADMIN']), async (req, res) => {
    try {
        const { project_name, location, description } = req.body;
        if (!project_name) return res.status(400).json({ success: false, message: 'Project name is required' });
        
        await db.query('INSERT INTO projects (project_name, location, description) VALUES (?, ?, ?)', [project_name, location, description]);
        res.json({ success: true, message: 'Project created successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ----------------- BUILDINGS -----------------
router.get('/projects/:projectId/buildings', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM buildings WHERE project_id = ? ORDER BY building_name', [req.params.projectId]);
        res.json({ success: true, buildings: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/buildings', requireRole(['ADMIN']), async (req, res) => {
    try {
        const { project_id, building_name, floors } = req.body;
        if (!project_id || !building_name) return res.status(400).json({ success: false, message: 'Project ID and Building name required' });
        
        await db.query('INSERT INTO buildings (project_id, building_name, floors) VALUES (?, ?, ?)', [project_id, building_name, floors || 1]);
        res.json({ success: true, message: 'Building created successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ----------------- UNITS -----------------
router.get('/buildings/:buildingId/units', async (req, res) => {
    try {
        const statusFilter = req.query.status ? 'AND status = ?' : '';
        const params = [req.params.buildingId];
        if (req.query.status) params.push(req.query.status);

        const [rows] = await db.query(`SELECT * FROM units WHERE building_id = ? ${statusFilter} ORDER BY unit_number`, params);
        res.json({ success: true, units: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/units', requireRole(['ADMIN']), async (req, res) => {
    try {
        const { building_id, unit_number, floor, unit_type, area, price, status } = req.body;
        if (!building_id || !unit_number || !price) {
            return res.status(400).json({ success: false, message: 'Building, unit number and price are required' });
        }
        
        await db.query(`
            INSERT INTO units (building_id, unit_number, floor, unit_type, area, price, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [building_id, unit_number, floor || 1, unit_type, area || null, price, status || 'Available']);
        
        res.json({ success: true, message: 'Unit created successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/units/:id', requireRole(['ADMIN']), async (req, res) => {
    try {
        const { unit_number, floor, unit_type, area, price, status } = req.body;
        await db.query(`
            UPDATE units 
            SET unit_number=?, floor=?, unit_type=?, area=?, price=?, status=? 
            WHERE id=?
        `, [unit_number, floor, unit_type, area, price, status, req.params.id]);
        
        res.json({ success: true, message: 'Unit updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
