const express = require('express');
const router = express.Router();
const db = require('../db.js');

// Middleware لفحص الصلاحيات
function checkRole(requiredRole) {
    return (req, res, next) => {
        const userRole = req.user?.role; // نفترض أن المستخدم مسجل دخول
        if (userRole === requiredRole || userRole === 'super_admin') {
            next();
        } else {
            res.status(403).json({ message: 'Access denied' });
        }
    };
}

// إضافة Agent
router.post('/add-agent', checkRole('super_admin'), async (req, res) => {
    try {
        const { name, phone } = req.body;
        await db.query(
            "INSERT INTO users (name, phone, role) VALUES ($1, $2, 'agent')",
            [name, phone]
        );
        res.json({ message: 'Agent added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// إضافة Supervisor
router.post('/add-supervisor', checkRole('super_admin'), async (req, res) => {
    try {
        const { name, phone } = req.body;
        await db.query(
            "INSERT INTO users (name, phone, role) VALUES ($1, $2, 'supervisor')",
            [name, phone]
        );
        res.json({ message: 'Supervisor added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// إضافة Super Admin (إذا احتجت لاحقًا)
router.post('/add-super-admin', async (req, res) => {
    try {
        const { name, phone } = req.body;
        await db.query(
            "INSERT INTO users (name, phone, role) VALUES ($1, $2, 'super_admin')",
            [name, phone]
        );
        res.json({ message: 'Super Admin added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
