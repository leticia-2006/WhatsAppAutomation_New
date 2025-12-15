const express = require('express');
const router = express.Router();
const db = require('../db');
const { getQRForNumber } = require('../waClient'); // استدعاء العميل الذي أنشأناه
const { requireLogin } = require("../middleware/auth");

const BASE_SESSIONS_SELECT = `
SELECT 
  s.*,
  c.name,
  c.phone,
  c.avatar_url,
  c.is_online,
  c.tags,
  (SELECT content FROM messages m 
     WHERE m.session_id = s.id 
     ORDER BY created_at DESC 
     LIMIT 1) AS last_message,
  (SELECT created_at FROM messages m 
     WHERE m.session_id = s.id 
     ORDER BY created_at DESC 
     LIMIT 1) AS last_message_time,
  (SELECT COUNT(*) FROM notes n 
     WHERE n.client_id = c.id) AS notes_count,
  (SELECT COUNT(*) FROM sessions s2 
     WHERE s2.client_id = c.id) > 1 AS is_repeat,
  u.name AS agent_name,
  u.avatar_url AS agent_avatar
FROM sessions s
JOIN clients c ON c.id = s.client_id
LEFT JOIN users u ON u.id = s.assigned_agent_id
`;
function applyRoleFilter({ role, id }, where = [], params = []) {
  if (role === "agent") {
    where.push(`s.assigned_agent_id = $${params.length + 1}`);
    params.push(id);
  }

  if (role === "admin") {
    where.push(`s.admin_id = $${params.length + 1}`);
    params.push(id);
  }

  if (role === "supervisor") {
    where.push(`s.supervisor_id = $${params.length + 1}`);
    params.push(id);
  }

  if (role === "super_admin") {
    // لا فلترة
  }

  return { where, params };
}
function cleanSessions(rows) {
  return rows.map(r => {
    if (r.jid) {
      r.phone = r.jid.replace(/@s\.whatsapp\.net$/, "");
    }

    // ✅ تنظيف التاغز
    if (r.tags) {
      if (Array.isArray(r.tags)) {
        r.tags = r.tags;
      } else if (typeof r.tags === "string") {
        r.tags = r.tags
          .split(",")
          .map(t => t.trim())
          .filter(Boolean);
      }
    } else {
      r.tags = [];
    }

    return r;
  });
}
router.get("/all", requireLogin, async (req, res) => {
  try {
    const user = req.session.user;

    let where = [];
    let params = [];

    ({ where, params } = applyRoleFilter(user, where, params));

    let query = BASE_SESSIONS_SELECT;
    if (where.length) query += " WHERE " + where.join(" AND ");
    query += " ORDER BY s.pinned DESC, s.updated_at DESC";

    const result = await db.query(query, params);
    res.json(cleanSessions(result.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// --- 3️⃣ جلسات حسب المجموعة ---
router.get("/group/:group_id", requireLogin, async (req, res) => {
  try {
    const user = req.session.user;
    const { group_id } = req.params;

    let where = [];
    let params = [];

    if (group_id !== "all") {
      where.push(`s.group_id = $${params.length + 1}`);
      params.push(group_id);
    }

    ({ where, params } = applyRoleFilter(user, where, params));

    let query = BASE_SESSIONS_SELECT;
    if (where.length) query += " WHERE " + where.join(" AND ");
    query += " ORDER BY s.pinned DESC, s.updated_at DESC";

    const result = await db.query(query, params);
    res.json(cleanSessions(result.rows));
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// --- 4️⃣ جلسات غير مقروءة ---
router.get("/unread", requireLogin, async (req, res) => {
  try {
    const user = req.session.user;

    let where = [`s.status = 'unread'`];
    let params = [];

    ({ where, params } = applyRoleFilter(user, where, params));

    let query = BASE_SESSIONS_SELECT +
      " WHERE " + where.join(" AND ") +
      " ORDER BY s.pinned DESC, s.updated_at DESC";

    const result = await db.query(query, params);
    res.json(cleanSessions(result.rows));
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// --- 5️⃣ جلسات غير مضافة رد عليها ---
router.get("/unreplied", requireLogin, async (req, res) => {
  try {
    const user = req.session.user;

    let where = [`s.status = 'unreplied'`];
    let params = [];

    ({ where, params } = applyRoleFilter(user, where, params));

    let query = BASE_SESSIONS_SELECT +
      " WHERE " + where.join(" AND ") +
      " ORDER BY s.pinned DESC, s.updated_at DESC";

    const result = await db.query(query, params);
    res.json(cleanSessions(result.rows));
  } catch (err) {
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
router.patch('/:id/status', requireLogin, async (req, res) => {
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
router.patch("/:id/toggle-pin", requireLogin, async (req, res) => {
  try {
    // جلب الحالة الحالية
    const current = await db.query("SELECT pinned FROM sessions WHERE id=$1", [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ error: "Session not found" });

    const newPinned = !current.rows[0].pinned; // عكس الحالة الحالية

    await db.query("UPDATE sessions SET pinned=$1, updated_at=NOW() WHERE id=$2", [newPinned, req.params.id]);

    res.json({ success: true, pinned: newPinned });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
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

/*router.get("/", requireLogin, async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { role, id: userId } = req.session.user;
  const { filter } = req.query; // ← إضافة الفلتر الجديد

  try {
    let baseQuery = `
      SELECT s.*, c.name, c.phone, c.avatar_url, c.is_online,
             (SELECT content FROM messages m WHERE m.session_id = s.id ORDER BY created_at DESC LIMIT 1) AS last_message,
             (SELECT COUNT(*) FROM notes n WHERE n.client_id = c.id) AS notes_count,
             (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) > 1 AS is_repeat,
             s.status, s.created_at, s.updated_at,
             c.is_blacklisted, c.is_invalid, c.tags
      FROM sessions s
      JOIN clients c ON c.id = s.client_id
      LEFT JOIN wa_numbers wn ON wn.id = s.wa_number_id
      WHERE 1=1
    `;

    // فلترة حسب نوع العميل
    if (filter === "vip") {
      baseQuery += ` AND c.tags ILIKE '%VIP%'`;
    } else if (filter === "repeat") {
      baseQuery += ` AND (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) > 1`;
    } else if (filter === "deal") {
      baseQuery += ` AND c.tags ILIKE '%Deal%'`;
    } else if (filter === "new") {
      baseQuery += ` AND c.created_at >= NOW() - INTERVAL '7 days'`;
    } else if (filter === "blacklist") {
      baseQuery += ` AND c.is_blacklisted = true`;
    } else if (filter === "invalid") {
      baseQuery += ` AND c.is_invalid = true`;
    }

    // فلترة حسب الدور (العميل أو المشرف)
    if (role === "agent") {
      baseQuery += ` AND s.assigned_agent_id = $1 ORDER BY s.updated_at DESC`;
    } else {
      baseQuery += ` ORDER BY s.updated_at DESC`;
    }

    const result = await db.query(baseQuery, role === "agent" ? [userId] : []);

    // تنظيف jid
    const cleanedRows = result.rows.map(row => {
      if (row.jid) row.phone = row.jid.replace(/@s\.whatsapp\.net$/, "");
      return row;
    });

    res.json(cleanedRows);
  } catch (err) {
    console.error("Error fetching sessions with filter:", err);
    res.status(500).json({ message: "Server error" });
  }
});*/
router.post("/mark-read/:sessionId", async (req, res) => {
  try {
    await db.query(
      "UPDATE sessions SET status='read', updated_at=NOW() WHERE id=$1",
      [req.params.sessionId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error marking session read:", err);
    res.status(500).json({ error: "Failed to mark read" });
  }
});
module.exports = router;







