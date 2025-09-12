const makeWASocket = require("@adiwajshing/baileys").default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@adiwajshing/baileys");
const  pool = require("./db");
const path = require("path");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const clients = {};
const qrCodes = {};

async function initClient(numberId) {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, `../auth_info/${numberId}`));
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({ version, auth: state });

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) qrCodes[numberId] = qr;
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) initClient(numberId);
    }
    sock.ev.on('connection.update', async ({ connection }) => {
  if (connection === 'open') {
    console.log(`✅ WhatsApp connected: ${numberId}`);
    await db.query("UPDATE wa_numbers SET status=$1 WHERE id=$2", ["active", numberId]);
  }
  if (connection === 'close') {
    console.log(`❌ WhatsApp disconnected: ${numberId}`);
    await db.query("UPDATE wa_numbers SET status=$1 WHERE id=$2", ["disconnected", numberId]);
  }
});
  });

 sock.ev.on("creds.update", saveCreds);

 sock.ev.on("messages.upsert", async (m) => {
  try {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return; // تجاهل الرسائل الفارغة أو المرسلة من البوت نفسه

    const sender = msg.key.remoteJid; 
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

    // 1. خزّن الرسالة في قاعدة البيانات
    const insertRes = await pool.query(
      "INSERT INTO messages (sender, content, wa_number_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id",
      [sender, text, 1] // مبدئيًا wa_number_id = 1 (تغير حسب الجلسة)
    );
    console.log("تم تخزين الرسالة:", insertRes.rows[0].id);

    // 2. تحقق من عدد الرسائل المرسلة من هذا العميل
    const countRes = await pool.query(
      "SELECT COUNT(*) FROM messages WHERE sender = $1",
      [sender]
    );
    const msgCount = parseInt(countRes.rows[0].count);

    // 3. منطق الأتمتة (بعد 3 رسائل انتقل للجروب 2)
    if (msgCount === 3) {
      await pool.query(
        "UPDATE sessions SET group_id = 2 WHERE phone = $1",
        [sender]
      );
      console.log(`🚀 المستخدم ${sender} تم نقله إلى الجروب 2 بعد ${msgCount} رسائل`);
    }

  } catch (err) {
    console.error("خطأ أثناء معالجة الرسالة:", err);
  }
});
  
sock.ev.on("messages.update", async (updates) => {
    for (let { key, update } of updates) {
      if (update.messageStubType === 1) {
        await pool.query("UPDATE messages SET is_deleted=true WHERE id=$1", [key.id]);
      }
    }
  });

  clients[numberId] = sock;
}

function getQRForNumber(numberId) {
  return qrCodes[numberId] || null;
}

async function sendMessageToNumber(numberId, jid, text) {
  const sock = clients[numberId];
  if (!sock) throw new Error("Client not initialized");
  await sock.sendMessage(jid, { text });
}

function getClientStatus(numberId) {
  return clients[numberId] ? "connected" : "disconnected";
}

module.exports = { initClient, getQRForNumber, sendMessageToNumber, getClientStatus };
