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
      const result = await db.query("SELECT * FROM wa_numbers ORDER BY id DESC");
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
router.post("/", requireLogin, checkRole(["super_admin"]), async (req, res) => {
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
router.post(
  "/:id/assign",
  requireLogin,
  checkRole(["admin", "super_admin"]),
  async (req, res) => {
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
router.delete(
  "/:id",
  requireLogin,
  checkRole(["super_admin"]),
  async (req, res) => {
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
    const { id } = req.params;
    const qr = getQRForNumber(parseInt(id));

    console.log("API /qr called for:", id, "result:", qr ? "FOUND" : "NULL");

    if (!qr) {
      return res.json({
        qr: null,
        message: "QR expired or client already connected"
      });
    }
    res.json({ qr });
  } catch (err) {
    console.error("Error fetching QR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 تأكيد / إعادة تفعيل الرقم
router.post("/:id/confirm", requireLogin, checkRole(["super_admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
     
      await db.query("UPDATE wa_numbers SET status=$1 WHERE id=$2", [
        "Disconnected", id,]);
      initClient(id);
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
