const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireLogin, checkRole } = require('../middleware/auth');

router.use(requireLogin);
// كل العملاء  
router.get('/', requireLogin, async (req, res) => {
  const { role, id, permissions } = req.session.user;

  try {
    let result;

    if (role === "super_admin") {
      result = await db.query(`
  SELECT 
    c.*, c.is_online,
    (SELECT content FROM messages m WHERE m.client_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
    (SELECT is_deleted FROM messages m WHERE m.client_id=c.id ORDER BY created_at DESC LIMIT 1) AS is_deleted,
    (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) > 1 AS is_repeat,
    (SELECT COUNT(*) FROM notes n WHERE n.client_id = c.id) AS notes_count,
    (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) AS sessions_count,
    u.name AS agent_name,
    u.avatar_url AS agent_avatar
  FROM clients c
  LEFT JOIN sessions s ON s.client_id = c.id
  LEFT JOIN wa_numbers wn ON wn.id = s.wa_number_id
  LEFT JOIN users u ON u.id = s.assigned_agent_id 
  ORDER BY c.updated_at DESC
`);
    } else if (role === "supervisor") {
      if (permissions.can_manage_users) {
        result = await db.query(`
  SELECT 
    c.*, c.is_online,
    (SELECT content FROM messages m WHERE m.client_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
    (SELECT is_deleted FROM messages m WHERE m.client_id=c.id ORDER BY created_at DESC LIMIT 1) AS is_deleted,
    (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) > 1 AS is_repeat,
    (SELECT COUNT(*) FROM notes n WHERE n.client_id = c.id) AS notes_count,
    (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) AS sessions_count,
    u.name AS agent_name,
    u.avatar_url AS agent_avatar
  FROM clients c
  LEFT JOIN sessions s ON s.client_id = c.id
  LEFT JOIN wa_numbers wn ON wn.id = s.wa_number_id
  LEFT JOIN users u ON u.id = s.assigned_agent_id 
  ORDER BY c.updated_at DESC
`);
      } else {
        result = await db.query(`
          SELECT c.*, 
            (SELECT content FROM messages m WHERE m.client_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message
          FROM clients c
          JOIN sessions s ON s.client_id = c.id
          WHERE c.supervisor_id = $1
          ORDER BY c.id DESC
        `, [id]);
      }
    } else if (role === "admin") {
      result = await db.query(`
        SELECT c.*, 
          (SELECT content FROM messages m WHERE m.client_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
          (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) > 1 AS is_repeat,
          (SELECT COUNT(*) FROM notes n WHERE n.client_id = c.id) AS notes_count,
          (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) AS sessions_count
        FROM clients c
        JOIN sessions s ON s.client_id = c.id 
        WHERE c.admin_id = $1
        ORDER BY c.id DESC
      `, [id]);
    } else if (role === "agent") {
      result = await db.query(`
        SELECT c.*, c.is_online,
          (SELECT content FROM messages m WHERE m.client_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
          (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) > 1 AS is_repeat,
          (SELECT COUNT(*) FROM notes n WHERE n.client_id = c.id) AS notes_count,
          (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) AS sessions_count,
       u.name AS agent_name, u.avatar_url AS agent_avatar
        FROM clients c
        JOIN sessions s ON s.client_id = c.id
        JOIN wa_numbers wn ON wn.id = s.wa_number_id
        JOIN users u ON u.id = s.assigned_agent_id 
        WHERE s.assigned_agent_id = $1
        ORDER BY c.id DESC
      `, [id]);
    } else {
      return res.status(403).json({ error: "Not allowed" });
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// عرض عميل محدد
router.get('/:client_id', requireLogin, async (req, res) => {
  try {
    const clientId = req.params.client_id;
    const result = await db.query(`
      SELECT 
        c.*, c.is_online,
        (SELECT content FROM messages m WHERE m.client_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT is_deleted FROM messages m WHERE m.client_id=c.id ORDER BY created_at DESC LIMIT 1) AS is_deleted,
        (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) > 1 AS is_repeat,
        (SELECT COUNT(*) FROM notes n WHERE n.client_id = c.id) AS notes_count,
        (SELECT COUNT(*) FROM sessions s2 WHERE s2.client_id = c.id) AS sessions_count,
        u.name AS agent_name, u.avatar_url AS agent_avatar
      FROM clients c
      LEFT JOIN sessions s ON s.client_id = c.id
      LEFT JOIN wa_numbers wn ON wn.id = s.wa_number_id
      LEFT JOIN users u ON u.id = s.assigned_agent_id 
      WHERE c.id = $1
    `, [clientId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

   const notes = await db.query(
      "SELECT * FROM notes WHERE client_id=$1 ORDER BY created_at DESC",
      [clientId]
    );

    res.json({ ...result.rows[0], notes: notes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ إضافة ملاحظة للعميل (Agents/Admins/Supervisor)
router.post("/:client_id/notes", requireLogin, async (req, res) => {
  try {
    const { client_id } = req.params;
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({ error: "Note cannot be empty" });
    }

    const result = await db.query("SELECT id FROM clients WHERE id=$1", [client_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    const newNote = await db.query(
  "INSERT INTO notes (client_id, user_id, note, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *",
  [client_id, req.session.user.id, note]
);
    res.json(newNote.rows[0]);
  } catch (err) {
    console.error("Error adding note:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ تحديث بيانات العميل (فقط Admin أو SuperAdmin)
router.put("/:client_id", requireLogin, checkRole(["admin", "super_admin"]), async (req, res) => {
  try {
    const { client_id } = req.params;
    const { name, phone, tags, is_blacklisted, is_invalid} = req.body;

    const result = await db.query("SELECT id FROM clients WHERE id=$1", [client_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    const updated = await db.query(
      `UPDATE clients SET 
    name = COALESCE($1, name),
    phone = COALESCE($2, phone),
    tags = COALESCE($3, tags),
    is_blacklisted = COALESCE($4, is_blacklisted),
    is_invalid = COALESCE($5, is_invalid),
    updated_at = NOW() WHERE id=$6
      RETURNING *`,
      [name, phone, tags, is_blacklisted, is_invalid, client_id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error("Error updating client:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ حذف عميل (فقط SuperAdmin)
router.delete("/:client_id", requireLogin, checkRole(["super_admin"]), async (req, res) => {
  try {
    const { client_id } = req.params;

    const result = await db.query("SELECT id FROM clients WHERE id=$1", [client_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    await db.query("DELETE FROM clients WHERE id=$1", [client_id]);
    res.json({ success: true, message: "Client deleted successfully" });
  } catch (err) {
    console.error("Error deleting client:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Toggle Blacklist (حظر أو إلغاء الحظر)
router.patch("/:client_id/blacklist", requireLogin, async (req, res) => {
  try {
    const { client_id } = req.params;
    const { block } = req.body; // true أو false

    const result = await db.query(`
      UPDATE clients 
      SET is_blacklisted = $1, updated_at = NOW() 
      WHERE id = $2 RETURNING id, is_blacklisted
    `, [block, client_id]);

    if (result.rowCount === 0) return res.status(404).json({ error: "Client not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error toggling blacklist:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// في الأعلى مع بقية require
const path = require("path");
const multer = require("multer");

// إعداد التخزين في مجلد uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `client_${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("صيغة الصورة غير مدعومة"));
    }
    cb(null, true);
  }
});

// 📤 رفع صورة العميل وتحديث avatar_url
router.post("/:client_id/upload-avatar", requireLogin, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "لم يتم رفع أي صورة" });

    const clientId = req.params.client_id;
    const avatarUrl = `${process.env.BASE_URL || "https://whatsappautomation-new-4fec.onrender.com"}/uploads/${req.file.filename}`;

    await db.query("UPDATE clients SET avatar_url=$1 WHERE id=$2", [avatarUrl, clientId]);

    res.json({ success: true, avatar_url: avatarUrl });
  } catch (err) {
    console.error("❌ خطأ أثناء رفع الصورة:", err);
    res.status(500).json({ error: "حدث خطأ أثناء رفع الصورة" });
  }
});


module.exports = router;









