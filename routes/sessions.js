const express = require('express');
const router = express.Router();
const db = require('../db.js');
const { getLatestQR } = require('../whatsappClient'); // استدعاء العميل الذي أنشأناه

// --- 1️⃣ عرض QR Code لرقم محدد ---
router.get('/qr/:number_id', async (req, res) => {
    try {
        const numberId = req.params.number_id;
        const qr = getLatestQR(numberId);
        res.json({ qr: qr || null });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- 2️⃣ عرض كل الجلسات مع حالة الرسائل (محذوفة أم لا) ---
router.get('/all', async (req, res) => {
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

// --- 3️⃣ جلسات حسب المجموعة ---
router.get('/group/:group_id', async (req, res) => {
    try {
        const groupId = req.params.group_id;
        const result = await db.query(`
            SELECT c.*, m.content AS last_message, m.is_deleted
            FROM clients c
            LEFT JOIN messages m ON m.client_id = c.id
            WHERE c.group_id = $1
            ORDER BY c.id DESC
        `, [groupId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- 4️⃣ جلسات غير مقروءة ---
router.get('/unread', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.*, m.content AS last_message, m.is_deleted
            FROM clients c
            LEFT JOIN messages m ON m.client_id = c.id
            WHERE c.status='unread'
            ORDER BY c.id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- 5️⃣ جلسات غير مضافة رد عليها ---
router.get('/unreplied', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.*, m.content AS last_message, m.is_deleted
            FROM clients c
            LEFT JOIN messages m ON m.client_id = c.id
            WHERE c.status='unreplied'
            ORDER BY c.id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- 6️⃣ حذف رسالة (لا تحذف فعليًا بل تجعلها "محذوفة") ---
router.post('/delete-message/:message_id', async (req, res) => {
    try {
        const messageId = req.params.message_id;
        await db.query('UPDATE messages SET is_deleted = TRUE WHERE id = $1', [messageId]);
        res.json({ message: 'Message marked as deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;



