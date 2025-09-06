const express = require('express');
const router = express.Router();
const db = require('../db.js');
const bcrypt = require('bcrypt');
const { requireLogin, checkRole } = require('../middleware')


// إضافة Agent
router.post('/add-agent', requireLogin,checkRole('super_admin'), async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            "INSERT INTO users (name, phone, role, password) VALUES ($1, $2, 'agent', $3)",
            [name, phone, hashedPassword]
        );
        res.json({ message: 'Agent added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// إضافة Supervisor
router.post('/add-supervisor', requireLogin, checkRole('super_admin'), async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            "INSERT INTO users (name, phone, role, password) VALUES ($1, $2, 'supervisor', $3)",
            [name, phone, hashedPassword]
        );
        res.json({ message: 'Supervisor added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// إضافة Super Admin (إذا احتجت لاحقًا)
router.post('/add-super-admin',requireLogin, checkRole('super_admin'), async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            "INSERT INTO users (name, phone, role, password) VALUES ($1, $2, 'super_admin', $3)",
            [name, phone, hashedPassword]
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





