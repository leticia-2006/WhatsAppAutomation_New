const makeWASocket = require("@adiwajshing/baileys").default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@adiwajshing/baileys");
const { Pool } = require("pg");
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
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (let msg of messages) {
      if (!msg.message) continue;
      const sessionRes = await pool.query(
        "SELECT id FROM sessions WHERE wa_number_id=$1 ORDER BY created_at DESC LIMIT 1",
        [numberId]
      );
      if (sessionRes.rowCount === 0) continue;
      const sessionId = sessionRes.rows[0].id;

      await pool.query(
        "INSERT INTO messages(session_id, sender_role, content, is_deleted, created_at) VALUES($1,$2,$3,$4,NOW())",
        [sessionId, "client", msg.message.conversation || "", false]
      );
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
