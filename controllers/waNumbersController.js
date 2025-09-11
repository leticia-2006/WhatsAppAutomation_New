const db = require("../config/db");
const { createWAClient, getLatestQR, sessions } = require("../wa/waClient");

// ✅ إضافة رقم جديد وربطه
exports.addNumber = async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.status(400).json({ error: "Number required" });

    // أضف الرقم في DB
    const result = await db.query(
      "INSERT INTO wa_numbers (number, status, created_at) VALUES ($1, $2, NOW()) RETURNING id",
      [number, "pending"]
    );

    const numberId = result.rows[0].id;

    // شغل سشن جديد
    await createWAClient(numberId);

    res.json({ message: "Number added, scan QR to activate", numberId });
  } catch (err) {
    console.error("Add Number Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ إحضار QR
exports.getQRCode = async (req, res) => {
  const { id } = req.params;
  try {
    const qr = getLatestQR(id);
    if (!qr) return res.status(404).json({ error: "QR not available yet" });
    res.json({ qr });
  } catch (err) {
    console.error("QR Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ إزالة رقم
exports.removeNumber = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM wa_numbers WHERE id=$1", [id]);
    if (sessions[id]) delete sessions[id];
    res.json({ message: "Number removed" });
  } catch (err) {
    console.error("Remove Number Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ تأكيد رقم (تغيير status)
exports.confirmNumber = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE wa_numbers SET status=$1 WHERE id=$2", ["active", id]);
    res.json({ message: "Number confirmed" });
  } catch (err) {
    console.error("Confirm Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ نقل رقم لوكيل آخر
exports.transferNumber = async (req, res) => {
  const { id } = req.params;
  const { agentId } = req.body;
  try {
    await db.query("UPDATE wa_numbers SET agent_id=$1 WHERE id=$2", [agentId, id]);
    res.json({ message: "Number transferred to agent" });
  } catch (err) {
    console.error("Transfer Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ عرض الأرقام حسب الدور
exports.getNumbersByRole = async (req, res) => {
  const role = req.session.user.role;
  const userId = req.session.user.id;

  try {
    let result;
    if (role === "super_admin") {
      result = await db.query("SELECT * FROM wa_numbers ORDER BY id DESC");
    } else if (role === "admin") {
      result = await db.query("SELECT * FROM wa_numbers WHERE created_by=$1 ORDER BY id DESC", [userId]);
    } else {
      result = await db.query("SELECT * FROM wa_numbers WHERE agent_id=$1 ORDER BY id DESC", [userId]);
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Get Numbers Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
