const express = require('express');
const router = express.Router();
const db = require('../db');
const { getQRForNumber } = require('../waClient'); // استدعاء العميل الذي أنشأناه
const { requireLogin } = require("../middleware/auth");


router.get("/all", requireLogin, async (req, res) => {
 const { role, id, permissions} = req.session.user;
 try {
    let result;
     if (role === "super_admin") {
       result = await db.query(`
      SELECT 
  s.*, 
  c.name, c.phone, c.avatar_url, c.is_online,
  (SELECT content FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) AS last_message,
  (SELECT created_at FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) AS last_message_time,
  (SELECT COUNT(*) FROM notes n WHERE n.client_id = c.id) AS notes_count,
  (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) > 1 AS is_repeat,
  s.status, s.created_at, s.updated_at,
  u.name AS agent_name,
  u.avatar_url AS agent_avatar,
  c.is_blacklisted,
  c.is_invalid,
  c.tags
FROM sessions s
JOIN clients c ON c.id = s.client_id
LEFT JOIN wa_numbers wn ON wn.id = s.wa_number_id
LEFT JOIN users u ON u.id = s.assigned_agent_id 
WHERE c.is_blacklisted = false AND c.is_invalid = false
ORDER BY s.pinned DESC, s.updated_at DESC;
`);
 } else if(role === "supervisor") {
   if (permissions.can_manage_numbers)
   { result = await db.query(`
      SELECT 
  s.*, 
  c.name, c.phone, c.avatar_url, c.is_online,
  (SELECT content FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) AS last_message,
  (SELECT created_at FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) AS last_message_time,
  (SELECT COUNT(*) FROM notes n WHERE n.client_id = c.id) AS notes_count,
  (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) > 1 AS is_repeat,
  s.status, s.created_at, s.updated_at,
  u.name AS agent_name,
  u.avatar_url AS agent_avatar,
  c.is_blacklisted,
  c.is_invalid,
  c.tags
FROM sessions s
JOIN clients c ON c.id = s.client_id
LEFT JOIN wa_numbers wn ON wn.id = s.wa_number_id
LEFT JOIN users u ON u.id = s.assigned_agent_id 
ORDER BY s.pinned DESC, s.updated_at DESC;
    `);
   } else { 
     result = await db.query(`
      SELECT s.*, c.name, c.phone,
             (SELECT content FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) as last_message,
             s.status, s.created_at, s.updated_at,
             c.is_blacklisted, c.is_invalid, c.tags
      FROM sessions s
      JOIN clients c ON c.id = s.client_id
      WHERE s.supervisor_id = $1
      ORDER BY s.updated_at DESC
    `, [id]);}
 } else if (role === "admin") {
   result = await db.query(`
      SELECT s.*, c.name, c.phone, c.avatar_url, c.is_online,
             (SELECT content FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) as last_message,
             (SELECT COUNT(*) FROM notes n WHERE n.client_id = c.id) AS notes_count,
             (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) > 1 AS is_repeat,
             s.status, s.created_at, s.updated_at,
             c.is_blacklisted, c.is_invalid, c.tags
      FROM sessions s
      JOIN clients c ON c.id = s.client_id
      WHERE s.admin_id = $1
      ORDER BY s.pinned DESC, s.updated_at DESC;
    `, [id]);
 } else if (role === "agent") {
   result = await db.query(`
      SELECT s.*,  c.name, c.phone, c.avatar_url, c.is_online,
      c.avatar_url,
             u.name AS agent_name, u.avatar_url AS agent_avatar,
             (SELECT content FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) AS last_message,
             (SELECT COUNT(*) FROM notes n WHERE n.client_id = c.id) AS notes_count,
             (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) > 1 AS is_repeat,
             s.status, s.created_at, s.updated_at,
             c.is_blacklisted, c.is_invalid, c.tags
      FROM sessions s
      JOIN clients c ON c.id = s.client_id
      JOIN wa_numbers wn ON wn.id = s.wa_number_id
      LEFT JOIN users u ON u.id = wn.assigned_to
      WHERE wn.assigned_to = $1
      ORDER BY s.pinned DESC, s.updated_at DESC;
    `, [id]);
 } else {
  return res.status(403).json({ error: "Not allowed" });
 }
 res.json(result.rows);
  } catch (err) {
    console.error("Error fetching all sessions:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// --- 3️⃣ جلسات حسب المجموعة ---
router.get('/group/:group_id', async (req, res) => {
  try {
    const groupId = req.params.group_id;

    let result;
    if (groupId === "all") {
      // ✅ في حالة /group/all نعرض كل الجلسات بدون فلترة
      result = await db.query(`
        SELECT s.id, s.client_id, c.name as client_name,
               (SELECT content FROM messages m WHERE m.session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message,
               s.status, s.created_at, s.updated_at
        FROM sessions s
        JOIN clients c ON c.id = s.client_id
        ORDER BY s.updated_at DESC
      `);
    } else {
      // ✅ في حالة رقم حقيقي فقط
      result = await db.query(`
        SELECT s.id, s.client_id, c.name as client_name,
               (SELECT content FROM messages m WHERE m.session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message,
               s.status, s.created_at, s.updated_at
        FROM sessions s
        JOIN clients c ON c.id = s.client_id
        WHERE s.group_id = $1
        ORDER BY s.updated_at DESC
      `, [groupId]);
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Error in /group/:group_id", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- 4️⃣ جلسات غير مقروءة ---
router.get('/unread', requireLogin, async (req, res) => {
    try {
        const result = await db.query(`
         SELECT s.id, s.client_id, c.name AS client_name, c.phone, c.avatar_url, c.is_online,
            (SELECT content FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) AS last_message,
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
router.get('/unreplied', requireLogin, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.id, s.client_id, c.name as client_name, c.phone, c.avatar_url, c.is_online,
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

router.post("/add-note", requireLogin, async (req, res) => {
  const { clientId, note } = req.body;
  try {
    await db.query("INSERT INTO notes (client_id, user_id, note, created_at) VALUES ($1, $2, $3, NOW())",
  [clientId, req.session.user.id, note]
);
    res.json({ success: true });
  } catch (err) {
    console.error("Error saving note:", err);
    res.status(500).json({ error: "Failed to save note" });
  }
});
router.get("/:id/notes", requireLogin, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM notes WHERE client_id = $1 ORDER BY created_at DESC",
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "unread" | "unreplied" | "human"

  try {
    const result = await db.query(
      `UPDATE sessions SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING id, status`,
      [status, id]
    );
   if (result.rowCount === 0) {
   return res.status(404).json({ error: "Session not found" });
}

   res.json({ success: true });
  } catch (err) {
    console.error("Error updating session status:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:id/pin", requireLogin, async (req, res) => {
  await db.query("UPDATE sessions SET pinned=true WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});

router.post("/:id/unpin", requireLogin, async (req, res) => {
  await db.query("UPDATE sessions SET pinned=false WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});

router.patch('/:id/mark', requireLogin, async (req, res) => {
  const { id } = req.params;
  const { type, value } = req.body; // value = true | false

  const validFields = {
    pinned: 'pinned',
    invalid: 'is_invalid',
    human: 'is_human',
    blacklisted: 'is_blacklisted'
  };

  const field = validFields[type];
  if (!field) return res.status(400).json({ error: 'Invalid mark type' });

  try {
    const result = await db.query(
      `UPDATE sessions SET ${field} = $1, updated_at = NOW() WHERE id = $2 RETURNING id, ${field}`,
      [value ?? true, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Session not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error marking session:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/", requireLogin, async (req, res) => {
 if (!req.session.user) {
   return res.status(401).json({ message: "Unauthorized" });
 }
  const userRole = req.session.user.role;
  const userId = req.session.user.id;

  try {
    let result;
    if (userRole === "agent") {
      result = await db.query(`
      SELECT s.id, s.client_id, c.name AS name, c.phone AS phone, c.is_online,
            (SELECT content FROM messages m WHERE m.session_id= s.id ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT COUNT(*) FROM notes n WHERE n.client_id = c.id) AS notes_count,
            (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) > 1 AS is_repeat,
            s.status, s.created_at, s.updated_at,
            s.wa_number_id, s.jid
            FROM sessions s
            JOIN clients c ON c.id = s.client_id
            JOIN wa_numbers wn ON wn.id = s.wa_number_id 
            WHERE s.assigned_agent_id = $1
            ORDER BY s.updated_at DESC `, [userId]
     );
    } else {
      result = await db.query(
        `SELECT s.id, s.client_id, c.name As name, c.phone AS phone, c.avatar_url, 
                (SELECT content FROM messages m WHERE m.session_id = s.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                s.status, s.created_at, s.updated_at,
                wn.assigned_to AS agent_id,
                s.wa_number_id, s.jid       
         FROM sessions s
         JOIN clients c ON c.id = s.client_id
         JOIN wa_numbers wn ON wn.id = s.wa_number_id
         ORDER BY s.updated_at DESC`
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching sessions:", err);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;


















































