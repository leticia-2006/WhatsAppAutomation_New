const express = require('express');
const router = express.Router();
const db = require('../db.js');
const { getLatestQR } = require('../whatsappClient'); // استدعاء العميل الذي أنشأناه

router.get('/qr', (req, res) => {
     const qr = getLatestQR();
     if (qr) {
        res.json({ qr }); // إرسال الكود للواجهة
     } else {
            res.json({ qr: null });
        }
});  

// All sessions
router.get('/all', async (req, res) => {
    try {
        console.log('Fetching all sessions...');
        const result = await db.query('SELECT * FROM clients');
        const rows = result.rows;
        console.log('Rows:', rows);
        res.json(rows);
    } catch (err) {
        console.error('Error in /all route:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Group sessions
router.get('/group', async (req, res) => {
    try {
        console.log('Fetching group sessions...');
        const result = await db.query('SELECT * FROM clients WHERE group_id=1');
        const rows = result.rows;
        console.log('Group Rows:', rows);
        res.json(rows);
    } catch (err) {
        console.error('Error in /group route:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Unread sessions
router.get('/unread', async (req, res) => {
    try {
        console.log('Fetching unread sessions...');
        const result = await db.query("SELECT * FROM clients WHERE status='unread'");
        const rows = result.rows;
        console.log('Unread Rows:', rows);
        res.json(rows);
    } catch (err) {
        console.error('Error in /unread route:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Unreplied sessions
router.get('/unreplied', async (req, res) => {
    try {
        console.log('Fetching unreplied sessions...');
        const result = await db.query("SELECT * FROM clients WHERE status='unreplied'");
        const rows = result.rows;
        console.log('Unreplied Rows:', rows);
        res.json(rows);
    } catch (err) {
        console.error('Error in /unreplied route:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;








