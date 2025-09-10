const express = require('express');
const router = express.Router();
const db = require('../db.js');
const { sendMessageToNumber } = require('../whatsappClient.js');

// routes/sessions.js
router.get("/", async (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    let result;
    if (userRole === "agent") {
      result = await db.query(
        `SELECT s.id, s.client_id, c.name as client_name, 
                (SELECT content FROM messages m WHERE m.session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message,
                s.status, s.created_at
         FROM sessions s
         JOIN clients c ON c.id = s.client_id
         JOIN wa_number_agents wna ON wna.wa_number_id = s.wa_number_id
         WHERE wna.agent_id=$1
         ORDER BY s.updated_at DESC`,
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

// إرسال رسالة جديدة
router.post('/send', async (req, res) => {
    const { sessionId, senderRole, content, to } = req.body;
    try {
     // ✅ جلب رقم الواتساب المرتبط
        const session = await db.query(
            `SELECT s.*, wn.number as wa_number FROM sessions s JOIN wa_numbers wn ON wn.id = s.wa_numbers_id WHERE s_id = $1 AND wn.status = 'active' LIMIT 1`,
            [sessionId]
        );

        if (session.rows.length === 0) {
            return res.status(400).json({ message: 'No active session found' });
        }

        const { client_id, wa_number } = session.rows[0];

        // ✅ إرسال الرسالة عبر الرقم المرتبط
        await sendMessageToNumber(wa_number, client_id, content);
        const result = await db.query(
            `INSERT INTO messages (session_id, sender_role, content)
             VALUES ($1, $2, $3) RETURNING *`,
            [sessionId, senderRole, content]
        );
        res.json({ message: 'Message sent', data: result.rows[0] });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// حذف رسالة (تعليمها كمحذوفة لكن تبقى للعرض)
router.post('/delete', async (req, res) => {
    const { messageId } = req.body;
    try {
        const result = await db.query(
            `UPDATE messages SET is_deleted = TRUE 
             WHERE id = $1 RETURNING *`,
            [messageId]
        );
        if (result.rows.length ===0) {
            return
     res.status(404).json({ message: "Message not found" });
        }
        
        res.json({ message: 'Message marked as deleted', data: result.rows[0] });
    } catch (err) {
        console.error('Error deleting message:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
