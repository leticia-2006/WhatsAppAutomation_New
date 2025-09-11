const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const { sendMessageToNumber } = require("../waClient");
const translate = require("vitalets/google-translate-api");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// جلب الرسائل لجلسة
router.get("/:sessionId", async (req, res) => {
  const result = await pool.query("SELECT * FROM messages WHERE session_id=$1 ORDER BY created_at ASC", [req.params.sessionId]);
  res.json(result.rows);
});

// إرسال رسالة
router.post("/:sessionId/send", async (req, res) => {
  const { text, waNumberId, jid } = req.body;
  try {
    await sendMessageToNumber(waNumberId, jid, text);
    await pool.query(
      "INSERT INTO messages(session_id, sender_role, content, is_deleted, created_at) VALUES($1,$2,$3,$4,NOW())",
      [req.params.sessionId, "agent", text, false]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ترجمة رسالة
router.post("/:messageId/translate", async (req, res) => {
  const { lang } = req.body; // مثلاً "en", "fr", "ar"
  const msgRes = await pool.query("SELECT * FROM messages WHERE id=$1", [req.params.messageId]);
  if (msgRes.rowCount === 0) return res.status(404).json({ error: "Message not found" });

  const original = msgRes.rows[0].content;
  try {
    const result = await translate(original, { to: lang });
    await pool.query("UPDATE messages SET translated_content=$1 WHERE id=$2", [result.text, req.params.messageId]);
    res.json({ translated: result.text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


client.on('message', async (msg) => {
  console.log("New message:", msg.from, msg.body);

  try {
    // نبحث عن آخر session للرقم
    let session = await db.query(
      "SELECT id, group_id FROM sessions WHERE wa_number_id=$1 ORDER BY created_at DESC LIMIT 1",
      [numberId]
    );

    let sessionId;
    if (session.rows.length === 0) {
      // أول مرة: ننشئ session جديدة في group 1
      const newSession = await db.query(
        `INSERT INTO sessions (wa_number_id, status, group_id) 
         VALUES ($1, 'unread', 1) RETURNING id`,
        [numberId]
      );
      sessionId = newSession.rows[0].id;
    } else {
      sessionId = session.rows[0].id;
    }

    // نخزن الرسالة
    await db.query(
      `INSERT INTO messages (session_id, sender_role, content)  
       VALUES ($1, $2, $3)`,
      [sessionId, "client", msg.body]
    );
    const countRes = await db.query(
  "SELECT COUNT(*) FROM messages WHERE session_id=$1",
  [sessionId]
);
const msgCount = parseInt(countRes.rows[0].count, 10);

// إذا وصلت 3 رسائل → ننقل للجروب الثاني
if (msgCount >= 3) {
  await db.query(
    "UPDATE sessions SET group_id=2 WHERE id=$1",
    [sessionId]
  );
}

  } catch (err) {
    console.error("Error saving message:", err);
  }
});


module.exports = router;
