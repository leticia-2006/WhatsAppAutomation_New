const db = require("../db"); // ملف الاتصال بقاعدة البيانات
const { createWhatsAppClient, getLatestQR, Client } = require("../whatsappClient");
const qrcode = require("qrcode");

let clients = {}; // لتخزين كل الـ sessions

// إرجاع كل الأرقام
exports.getWANumbers = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM wa_numbers ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// إضافة رقم جديد (وإرجاع QR)
exports.addWANumber = async (req, res) => {
  try {
    const { number } = req.body;

    const result = await db.query("INSERT INTO wa_numbers (number, status) VALUES ($1, $2) RETURNING id", [number, "pending"]
    );
    const numberId = result.rows[0].id;

    createWhatsAppClient(numberId, "client_" + numberId);
  
    res.json({
      message: "Number added. Scan QR to activate.",
   id: numberId 
    });
  } catch (err) {
    console.error("Error adding number:", err);
    res.status(500).json({ error: err.message });
  }
};

// ربط الرقم بوكيل
exports.assignNumber = async (req, res) => {
  const { id } = req.params;
  const { agentId } = req.body;
  await db.query("UPDATE wa_numbers SET assigned_agent_id=$1 WHERE id=$2", [agentId, id]);
  res.json({ success: true });
};

// نقل الرقم لوكيل آخر
exports.transferNumber = async (req, res) => {
  const { id } = req.params;
  const { agentId } = req.body;
  await db.query("UPDATE wa_numbers SET assigned_agent_id=$1 WHERE id=$2", [agentId, id]);
  res.json({ success: true });
};

// تغيير الحالة
exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  await db.query("UPDATE wa_numbers SET status=$1 WHERE id=$2", [status, id]);
  res.json({ success: true });
};

// حذف رقم
exports.removeNumber = async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM wa_numbers WHERE id=$1", [id]);
  res.json({ success: true });
};

// إرجاع QR خاص برقم معين
exports.getQR = async (req, res) => {
  try {
    const { id } = req.params;
    const qr = getLatestQR(id);

    if (!qr) {
      return res.status(404).json({ error: "QR not found or client already connected" });
    }

    res.json({ qr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// إعادة تفعيل الرقم (Confirm)
exports.confirmNumber = async (req, res) => {
  try {
    const { id } = req.params;

    // نعيد تشغيل WhatsApp Client علشان يولد QR جديد
    createWhatsAppClient(id, "client_" + id);

    // نغير حالة الرقم إلى "pending"
    await db.query("UPDATE wa_numbers SET status=$1 WHERE id=$2", ["pending", id]);

    res.json({
      success: true,
      message: "Please scan QR again to confirm the number"
    });
  } catch (err) {
    console.error("Error confirming number:", err);
    res.status(500).json({ error: err.message });
  }
};
