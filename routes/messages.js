const express = require("express");
const router = express.Router();
const { sendMessageToNumber } = require("../waClient");
const translate = require("@vitalets/google-translate-api");
const db = require("../db");
const { requireLogin } = require("../middleware/auth");

// جلب الرسائل لجلسة
router.get("/:sessionId", async (req, res) => {
  const result = await db.query(`
  SELECT m.*,
       CASE 
         WHEN m.sender_type = 'client'
         THEN c.avatar_url 
         ELSE 'default-agent.png'
       END AS sender_avatar,
        c.name AS client_name 
  FROM messages m 
  JOIN sessions s ON m.session_id = s.id
  JOIN clients c ON c.id = s.client_id WHERE m.session_id=$1
  ORDER BY created_at ASC`, [req.params.sessionId]);
  res.json(result.rows);
});

// إرسال رسالة
// حفظ الرسالة بعد الإرسال
router.post("/:sessionId/send", requireLogin, async (req, res) => {
  const { text, mediaUrl, mediaType } = req.body;
  try {
   const sessionRes = await db.query("SELECT c.phone, c.wa_number_id FROM sessions s JOIN clients c ON c.id = s.client_id WHERE s.id=$1", [req.params.sessionId]);
if (sessionRes.rowCount === 0) return res.status(404).json({ error: "Session not found" });

const clientPhone = sessionRes.rows[0].phone;
    const waNumberId = sessionRes.rows[0].wa_number_id;

// إرسال للواتساب
    if (text) {
      await sendMessageToNumber(waNumberId, clientPhone, text);
    } else if (mediaUrl) {
      await sendMessageToNumber(clientPhone, { url: mediaUrl, type: mediaType });
    }

    // حفظ في DB
    await db.query(
      "INSERT INTO messages (session_id, sender_type, content, content_type, media_url, created_at) VALUES ($1, $2, $3, $4, $5,NOW())",
      [req.params.sessionId, "agent", text || null, mediaType || "text", mediaUrl || null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error sending message", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ترجمة رسالة
router.post("/:messageId/translate", async (req, res) => {
  const { lang } = req.body; // مثلاً "en", "fr", "ar"
  const msgRes = await db.query("SELECT * FROM messages WHERE id=$1", [req.params.messageId]);
  if (msgRes.rowCount === 0) return res.status(404).json({ error: "Message not found" });

  const original = msgRes.rows[0].content;
  try {
    const result = await translate(original, { to: lang });
    await db.query("UPDATE messages SET translated_content=$1 WHERE id=$2", [result.text, req.params.messageId]);
    res.json({ translated: result.text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
