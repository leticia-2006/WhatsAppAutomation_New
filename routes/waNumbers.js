const express = require("express");
const router = express.Router();
const db = require("../db");
const { initClient, getQRForNumber } = require("../waClient");
const { requireLogin, checkRole } = require("../middleware/auth");

// جلب الأرقام
router.get("/", requireLogin, async (req, res) => {
  const { role, id } = req.session.user;

  try {
    if (role === "super_admin") {
      const result = await db.query(`
    SELECT 
      w.id, w.number, w.status, w.assigned_to, u.name AS client_name, u.avatar_url AS client_avatar
    FROM wa_numbers w
    LEFT JOIN users u ON w.assigned_to = u.id
    ORDER BY w.id DESC
  `);
      return res.json(result.rows);
    }

    if (role === "admin") {
      const result = await db.query("SELECT * FROM wa_numbers WHERE assigned_agent_id IS NOT NULL ORDER BY id DESC");
      return res.json(result.rows);
    }

    if (role === "agent") {
      const result = await db.query("SELECT id, number, status FROM wa_numbers WHERE assigned_agent_id=$1", [id]);
      return res.json(result.rows);
    }

    return res.status(403).json({ error: "Not allowed" });
  } catch (err) {
    console.error("Error fetching numbers:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// 📌 إضافة رقم جديد + إنشاء جلسة
router.post("/", requireLogin, async (req, res) => {
  try {
    const { number } = req.body;

    const result = await db.query(
      "INSERT INTO wa_numbers (number, status) VALUES ($1, $2) RETURNING id",
      [number, "Disconnected"]
    );

    const numberId = result.rows[0].id;

    // تشغيل اتصال Baileys للرقم
    initClient(numberId);

    res.json({
      message: "Number added. Please scan QR to activate.",
      id: numberId,
    });
  } catch (err) {
    console.error("Error adding wa_number:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 ربط الرقم بوكيل
router.post("/:id/assign", requireLogin, checkRole(["admin", "super_admin"]), async (req, res) => {
    const { id } = req.params;
    const { agentId } = req.body;

    try {
      await db.query(
        "UPDATE wa_numbers SET assigned_agent_id=$1 WHERE id=$2",
        [agentId, id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error assigning number:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// 📌 نقل الرقم لوكيل آخر
router.post("/:id/transfer", requireLogin, checkRole(["admin", "super_admin"]), async (req, res) => {
  const { id } = req.params;
  const { agentId } = req.body;

  try {
    await db.query(
      "UPDATE wa_numbers SET assigned_agent_id=$1 WHERE id=$2",
      [agentId, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error transferring number:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 حذف رقم
router.delete("/:id", requireLogin, checkRole(["super_admin"]), async (req, res) => {
    const { id } = req.params;
    try {
      await db.query("DELETE FROM wa_numbers WHERE id=$1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting number:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// 📌 استرجاع QR Code لرقم معين
router.get("/:id/qr", requireLogin, async (req, res) => {
  try {
    const numberId = parseInt(req.params.id, 10);
    if (isNaN(numberId)) {
      return res.status(400).json({ error: "Invalid number id" });
    }

    let qr;
try {
  qr = getQRForNumber(numberId);
} catch (e) {
  console.error("Error generating QR:", e);
  return res.status(500).json({ qr: null, message: "Error generating QR" });
}

console.log("API /qr called for:", numberId, "result:", qr ? "FOUND" : "NULL");

res.json({
  qr: qr || null,
  message: qr ? "QR ready" : "QR expired or client already connected"
});
  } catch (err) {
    console.error("Error fetching QR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 تأكيد / إعادة تفعيل الرقم
router.post("/:id/confirm", requireLogin, checkRole(["super_admin"]),
  async (req, res) => {
    try {
      const numberId = parseInt(req.params.id, 10);
      if (isNaN(numberId)) {
        return res.status(400).json({ error: "Invalid number id" });
      }
      const result = await db.query("UPDATE wa_numbers SET status=$1 WHERE id=$2",
      ["Disconnected", numberId]);
      initClient(numberId);
      res.json({
        success: true,
        message: "Please scan QR again to confirm the number",
      });
    } catch (err) {
      console.error("Error confirming number:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// 📌 تغيير حالة الرقم (Active, Blocked, Disconnected)
router.patch("/:id/status", requireLogin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await db.query("UPDATE wa_numbers SET status=$1 WHERE id=$2", [status, id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
