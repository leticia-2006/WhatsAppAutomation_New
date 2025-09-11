const makeWASocket = require("@adiwajshing/baileys").default;
const { useMultiFileAuthState } = require("@adiwajshing/baileys");
const { Boom } = require("@hapi/boom");
const db = require("../config/db");
const qrCodes = {};

const sessions = {}; // نخزن كل السشنز

async function createWAClient(numberId) {
  const { state, saveCreds } = await useMultiFileAuthState(`./auth/${numberId}`);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  // حفظ QR لما يطلع
  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;
    if (qr) {
      qrCodes[numberId] = qr;
      console.log(`QR for ${numberId}: ${qr}`);
    }
    if (connection === "close") {
      console.log(`Session closed for ${numberId}, reconnecting...`);
      createWAClient(numberId);
    }
    if (connection === "open") {
      console.log(`✅ Connected: ${numberId}`);
    }
  });

  // استقبال رسائل جديدة
  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message) return;

    const sender = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

    try {
      await db.query(
        `INSERT INTO messages (wa_number_id, sender, content, is_deleted, created_at) 
         VALUES ($1, $2, $3, false, NOW())`,
        [numberId, sender, text]
      );
    } catch (err) {
      console.error("DB Insert Error:", err);
    }
  });

  // تحديث الرسائل (مثلاً حذف)
  sock.ev.on("messages.update", async (updates) => {
    for (let upd of updates) {
      if (upd.update.message === null) {
        // الرسالة اتمسحت
        try {
          await db.query(
            `UPDATE messages SET is_deleted=true WHERE id=$1`,
            [upd.key.id]
          );
        } catch (err) {
          console.error("DB Update Error:", err);
        }
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sessions[numberId] = sock;
}

// ترجّع آخر QR
function getLatestQR(numberId) {
  return qrCodes[numberId] || null;
}

module.exports = {
  createWAClient,
  getLatestQR,
  sessions,
};

