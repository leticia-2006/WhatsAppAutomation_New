const express = require('express');
const router = express.Router();
const db = require('../db.js');
const { getLatestQR } = require('../whatsappClient'); // استدعاء العميل الذي أنشأناه


router.get("/", async (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    let result;
    if (userRole === "agent") {
      result = await db.query(
      SELECT s.id, s.client_id, c.name as client_name
            (SELECT content FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) as last_message,
            s.status, s.created_at
            FROM sessions s
            JOIN clients c ON c.id = s.client_id
            WHERE s.status=''
            ORDER BY s.updated_at DESC `,
        [userId]
      );
    } else {
      result = await db.query(
        `SELECT s.id, s.client_id, c.name as client_name,
                (SELECT content FROM messages m WHERE m.session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message,
                s.status, s.created_at
         FROM sessions s
         JOIN clients c ON c.id = s.client_id
         ORDER BY s.updated_at DESC`
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching sessions:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "unread" | "unreplied" | "human"

  try {
    await db.query(
      `UPDATE sessions SET status=$1, updated_at=NOW() WHERE id=$2`,
      [status, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating session status:", err);
    res.status(500).json({ message: "Server error" });
  }
});


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
           SELECT s.id, s.client_id, c.name as client_name
            (SELECT content FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) as last_message,
            s.status, s.created_at
            FROM sessions s
            JOIN clients c ON c.id = s.client_id
            WHERE s.status='all'
            ORDER BY s.updated_at DESC
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
           SELECT s.id, s.client_id, c.name as client_name
            (SELECT content FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) as last_message,
            s.status, s.created_at
            FROM sessions s
            JOIN clients c ON c.id = s.client_id
            WHERE s.status='group/:group_id'
            ORDER BY s.updated_at DESC
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
         SELECT s.id, s.client_id, c.name as client_name
            (SELECT content FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) as last_message,
            s.status, s.created_at
            FROM sessions s
            JOIN clients c ON c.id = s.client_id
            WHERE s.status='unread'
            ORDER BY s.updated_at DESC  
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
            SELECT s.id, s.client_id, c.name as client_name
            (SELECT content FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) as last_message,
            s.status, s.created_at
            FROM sessions s
            JOIN clients c ON c.id = s.client_id
            WHERE s.status='unreplied'
            ORDER BY s.updated_at DESC
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





