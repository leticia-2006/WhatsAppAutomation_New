const express = require('express');
const router = express.Router();
const db = require('../db');
const { getQRForNumber } = require('../waClient'); // استدعاء العميل الذي أنشأناه


router.get("/", async (req, res) => {
 if (!req.session.user) {
   return res.status(401).json({ message: "Unauthorized" });
 }
  const userRole = req.session.user.role;
  const userId = req.session.user.id;

  try {
    let result;
    if (userRole === "agent") {
      result = await db.query(`
      SELECT s.id, s.client_id, c.name AS name, c.phone AS phone,
            (SELECT content FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) as last_message,
            s.status, s.created_at, s.updated_at
            FROM sessions s
            JOIN clients c ON c.id = s.client_id
            JOIN wa_numbers wn ON wn.id = s.wa_number_id 
            WHERE wn.assigned_agent_id = $1
            ORDER BY s.updated_at DESC `, [userId]
     );
    } else {
      result = await db.query(
        `SELECT s.id, s.client_id, c.name As name, c.phone AS phone, 
                (SELECT content FROM messages m WHERE m.session_id = s.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                s.status, s.created_at, s.updated_at
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
        const qr = getQRForNumber(numberId);
      if(!qr) {
        return res.status(404).json({ error: "QR not found or client already connected" });
      }
        res.json({ qr });
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
           SELECT s.id, s.client_id, c.name as client_name,
            (SELECT content FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) as last_message,
            s.status, s.created_at, s.updated_at
            FROM sessions s
            JOIN clients c ON c.id = s.client_id
            WHERE s.group_id = $1
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
         SELECT s.id, s.client_id, c.name as client_name,
            (SELECT content FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) as last_message,
            s.status, s.created_at, s.updated_at
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
            SELECT s.id, s.client_id, c.name as client_name,
            (SELECT content FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) as last_message,
            s.status, s.created_at, s.updated_at
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



module.exports = router;



















