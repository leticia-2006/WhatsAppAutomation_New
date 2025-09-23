const express = require("express");
const router = express.Router();
const { sendMessageToNumber } = require("../waClient");
const translate = require("@vitalets/google-translate-api");
const db = require("../db");


// جلب الرسائل لجلسة
router.get("/:sessionId", async (req, res) => {
  const result = await db.query("SELECT * FROM messages WHERE session_id=$1 ORDER BY created_at ASC", [req.params.sessionId]);
  res.json(result.rows);
});

// إرسال رسالة
router.post("/:sessionId/send", async (req, res) => {
  const { text, waNumberId, jid } = req.body;
  try {
    await sendMessageToNumber(waNumberId, jid, text);
    await db.query(
      "INSERT INTO messages(session_id, sender_role, content, wa_number_id, is_deleted, created_at, jid) VALUES($1,$2,$3,$4,$5,NOW(),$6)",
      [req.params.sessionId, "agent", text, waNumberId, false, jid]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
