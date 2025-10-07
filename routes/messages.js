const express = require("express");
const router = express.Router();
const { sendMessageToNumber, clients } = require("../waClient");
const translate = require("@vitalets/google-translate-api");
const db = require("../db");
const { requireLogin } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const upload = multer({ dest: path.join(__dirname, "../uploads") });

// جلب الرسائل لجلسة
router.get("/:sessionId", requireLogin, async (req, res) => {
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
  const { content, mediaUrl, mediaType } = req.body;
  try {
   const sessionRes = await db.query("SELECT c.phone, s.wa_number_id FROM sessions s JOIN clients c ON c.id = s.client_id WHERE s.id=$1", [req.params.sessionId]);
if (sessionRes.rowCount === 0) return res.status(404).json({ error: "Session not found" });

const clientPhone = sessionRes.rows[0].phone;
    const waNumberId = sessionRes.rows[0].wa_number_id;

console.log("=== Debug Sending Message ===");
console.log("waNumberId:", waNumberId);
console.log("clients keys:", Object.keys(clients));
const sock = clients[waNumberId];
console.log("sock:", sock ? "exists" : "not found");
console.log("sock readyState:", sock?.ws?.readyState);
console.log("clientPhone (JID):", clientPhone);
  // إرسال للواتساب
    if (content) {
      await sendMessageToNumber(waNumberId, clientPhone, content);
    } else if (mediaUrl) {
      await sendMessageToNumber(waNumberId, clientPhone, { url: mediaUrl, type: mediaType });
    }

   const session = await db.query("SELECT * FROM sessions WHERE id=$1", [req.params.sessionId]);
  if (!session.rows.length) return res.status(404).json({ error: "Session not found" });
    // حفظ في DB
    /*await db.query(
      "INSERT INTO messages (session_id, sender_type, content, content_type, media_url, created_at) VALUES ($1, $2, $3, $4, $5,NOW())",
      [req.params.sessionId, "agent", content || null, mediaType || "text", mediaUrl || null]
    );*/

    res.json({ success: true });
  } catch (err) {
    console.error("Error sending message", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ترجمة رسالة
router.post("/:messageId/translate", requireLogin, async (req, res) => {
  const { lang } = req.body; ///مثلاً "en", "fr", "ar"
  const msgRes = await db.query("SELECT * FROM messages WHERE id=$1", [req.params.messageId]);
  if (msgRes.rowCount === 0) return res.status(404).json({ error: "Message not found" });

  const original = msgRes.rows[0].content;
  try {
  const sessionRes = await db.query("SELECT lang FROM sessions s JOIN messages m ON m.session_id = s.id WHERE m.id=$1", [req.params.messageId]);
  const fromLang = sessionRes.rows[0]?.lang || "auto";
  const result = await translate(original, { from: fromLang, to: lang });
    await db.query("UPDATE messages SET translated_content=$1 WHERE id=$2", [result.text, req.params.messageId]);
    res.json({ translated: result.text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// إرسال ملفات
router.post("/:sessionId/sendMedia", requireLogin, upload.single("file"), async (req, res) => {
  try {
    const sessionRes = await db.query("SELECT c.phone, s.wa_number_id FROM sessions s JOIN clients c ON c.id = s.client_id WHERE s.id=$1", [req.params.sessionId]);
    if (sessionRes.rowCount === 0) return res.status(404).json({ error: "Session not found" });

    const clientPhone = sessionRes.rows[0].phone;
    const waNumberId = sessionRes.rows[0].wa_number_id;
   // multer أو أي مكتبة لتحميل الملفات
    const file = req.file;  
    if (!file) return res.status(400).json({ error: "لم يتم رفع أي ملف" });

    const mediaType = req.body.mediaType || file.mimetype.split("/")[0];

    // المسار داخل مجلد uploads
    const filePath = `/uploads/${file.filename}`;

    await sendMessageToNumber(waNumberId, clientPhone, { url: filePath, type: mediaType });

    await db.query(
      "INSERT INTO messages (session_id, sender_type, content, content_type, media_url, created_at) VALUES ($1, $2, $3, $4, $5,NOW())",
      [req.params.sessionId, "agent", null, mediaType, filePath]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send media" });
  }
});

module.exports = router;
