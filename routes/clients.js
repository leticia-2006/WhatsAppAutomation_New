
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireLogin } = require('../middleware/auth');

router.use(requireLogin);
// كل العملاء مع آخر رسالة
router.get('/', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.*, m.content AS last_message, m.is_deleted
            FROM clients c
            LEFT JOIN messages m ON m.client_id = c.id
            ORDER BY c.id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// عرض عميل محدد
router.get('/:client_id', async (req, res) => {
    try {
        const clientId = req.params.client_id;
        const result = await db.query(`
            SELECT c.*, m.content AS last_message, m.is_deleted
            FROM clients c
            LEFT JOIN messages m ON m.client_id = c.id
            WHERE c.id = $1
        `, [clientId]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;





