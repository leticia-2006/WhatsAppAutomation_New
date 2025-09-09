const db = require("../db"); // ملف الاتصال بقاعدة البيانات
const { Client } = require("whatsapp-web.js");
const qrcode = require("qrcode");

let clients = {}; // لتخزين كل الـ sessions

// إرجاع كل الأرقام
exports.getWANumbers = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM wa_numbers ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// إضافة رقم جديد (وإرجاع QR)
exports.addWANumber = async (req, res) => {
  try {
    const { number } = req.body;

    // إنشاء session جديد
    const client = new Client({
      puppeteer: { headless: true },
    });

    clients[number] = client;

    client.on("qr", async qr => {
      const qrImage = await qrcode.toDataURL(qr);
      res.json({ qr: qrImage }); // نرجع صورة QR للواجهة
    });

    client.on("ready", async () => {
      console.log(`✅ WhatsApp client ready for number: ${number}`);
      await db.query("INSERT INTO wa_numbers (number, status) VALUES (?, ?)", [number, "Active"]);
    });

    client.on("disconnected", async () => {
      await db.query("UPDATE wa_numbers SET status=? WHERE number=?", ["Disconnected", number]);
    });

    client.initialize();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ربط الرقم بوكيل
exports.assignNumber = async (req, res) => {
  const { id } = req.params;
  const { agentId } = req.body;
  await db.query("UPDATE wa_numbers SET assigned_agent_id=? WHERE id=?", [agentId, id]);
  res.json({ success: true });
};

// نقل الرقم لوكيل آخر
exports.transferNumber = async (req, res) => {
  const { id } = req.params;
  const { agentId } = req.body;
  await db.query("UPDATE wa_numbers SET assigned_agent_id=? WHERE id=?", [agentId, id]);
  res.json({ success: true });
};

// تغيير الحالة
exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  await db.query("UPDATE wa_numbers SET status=? WHERE id=?", [status, id]);
  res.json({ success: true });
};

// حذف رقم
exports.removeNumber = async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM wa_numbers WHERE id=?", [id]);
  res.json({ success: true });
};
