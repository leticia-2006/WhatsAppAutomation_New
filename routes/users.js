const express = require('express');
const router = express.Router();
const db = require('../db.js');
const bcrypt = require('bcrypt');

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

//login
router.post('/login', async (req, res) => {
    const { phone, password } = req.body;

    try {
        const result = await db.query("SELECT * FROM users WHERE phone = $1", [phone]);
        if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) return res.status(401).json({ message: 'Invalid credentials' });

        res.json({ message: 'Login successful', user: { id: user.id, name: user.name, role: user.role } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

