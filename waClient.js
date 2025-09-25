const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys");
const db = require("./db");
const path = require("path");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");



const clients = {};
const qrCodes = {};

async function initClient(numberId) {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, `../auth_info/${numberId}`));
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({ version, auth: state });

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrCodes[numberId] = qr;
    console.log("✅ QR STORED for numberId:", numberId, qr.substring(0, 20));
    }
    console.log("Connection update:", connection, numberId);
    if (connection === "open") {
    console.log(`✅ WhatsApp connected: ${numberId}`);
    await db.query("UPDATE wa_numbers SET status=$1 WHERE id=$2", ["Active", numberId]);
    setTimeout(() => delete qrCodes[numberId], 60000);
    }
    
    if (connection === 'close') {
    console.log(`❌ WhatsApp disconnected: ${numberId}`);
    await db.query("UPDATE wa_numbers SET status=$1 WHERE id=$2", ["Disconnected", numberId]);
    const reason = lastDisconnect?.error?.output?.statusCode;
    if (reason === DisconnectReason.loggedOut) {
  console.log(`⚠️ رقم ${numberId} تم تسجيل الخروج بالكامل`);
  // امسح بيانات الاعتماد من السيرفر
  fs.rmSync(path.join(__dirname, "..", "auth_info", `${numberId}`), { recursive: true, force: true });
  await db.query("UPDATE wa_numbers SET status=$1 WHERE id=$2", ["LoggedOut", numberId]);
} else {
  console.log(`🔄 إعادة محاولة الاتصال بالرقم ${numberId} بعد 5 ثواني...`);
    setTimeout(() =>
  initClient(numberId), 5000);
    }
}

 sock.ev.on("creds.update", saveCreds);

 sock.ev.on("messages.upsert", async (m) => {
   console.log("Event messages.upsert Triggered");
  try {
    const msg = m.messages[0];
    console.log("Raw message object:", JSON.stringify(msg, null, 2));
    
    if (!msg.message) {
      console.log("An empthy message that was ignored"); 
    return;
    }

    const isFromMe = msg.key.fromMe;
    const sender = msg.key.remoteJid; 
    console.log("Sender:", sender);
    
let text = "[رسالة غير مدعومة]";
let contentType = "text";
let mediaUrl = null;

if (msg.message.conversation) {
  text = msg.message.conversation;
} else if (msg.message.extendedTextMessage?.text) {
  text = msg.message.extendedTextMessage.text;
} else if (msg.message.imageMessage) {
  contentType = "image";
  const buffer = await downloadMediaMessage(msg, "buffer", {});
  const fileName = `${numberId}_${Date.now()}.jpg`;
  const filePath = path.join(__dirname, "..", "uploads", fileName);
  fs.writeFileSync(filePath, buffer);
  mediaUrl = `/uploads/${fileName}`;
  text = "[📷 صورة]";
} else if (msg.message.videoMessage) {
  contentType = "video";
  const buffer = await downloadMediaMessage(msg, "buffer", {});
  const fileName = `${numberId}_${Date.now()}.mp4`;
  const filePath = path.join(__dirname, "..", "uploads", fileName);
  fs.writeFileSync(filePath, buffer);
  mediaUrl = `/uploads/${fileName}`;
  text = "[🎥 فيديو]";
}
console.log("Content of the message", text, "نوع:", contentType, "رابط:", mediaUrl);

let clientRes = await db.query("SELECT id FROM clients WHERE phone=$1", [sender]);
let clientId;
if (clientRes.rowCount === 0) {
  const newClient = await db.query(
    "INSERT INTO clients (name, phone) VALUES ($1,$2) RETURNING id",
    ["Unknown", sender]
  );
  clientId = newClient.rows[0].id;
} else {
  clientId = clientRes.rows[0].id;
}   
// ابحث عن session
let sessionRes = await db.query(
  "SELECT id FROM sessions WHERE client_id=$1 AND wa_number_id=$2",
  [clientId, numberId]
);

let sessionId;
if (sessionRes.rowCount === 0) {
  const newSession = await db.query(
    "INSERT INTO sessions (client_id, wa_number_id, group_id, status, created_at, updated_at, finalJid) VALUES ($1,$2,1,'unread',NOW(),NOW(),$3) RETURNING id",
    [clientId, numberId, sender]
  );
  sessionId = newSession.rows[0].id;
 
  await db.query(
    "UPDATE wa_numbers SET session_id=$1 WHERE id=$2",
    [sessionId, numberId]
  );
} else {
  sessionId = sessionRes.rows[0].id;
}

// 1. خزّن الرسالة مرتبطة بالجلسة
const finalJid = sender.includes("@s.whatsapp.net") ? sender : sender + "@s.whatsapp.net";
const insertRes = await db.query(
  "INSERT INTO messages (session_id, sender_type, content, content_type, media_url, wa_number_id, is_deleted, created_at, jid) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8) RETURNING id",
  [sessionId, isFromMe ? "agent" : "client", text, contentType, mediaUrl, numberId, false, finalJid]
);
    console.log("تم تخزين الرسالة:", insertRes.rows[0].id);
    

// 2. منطق الأتمتة (بعد 3 رسائل انتقل للجروب 2)
let msgCount = 0;
    if (!isFromMe) {
     const countRes = await db.query(
       "SELECT COUNT(*) FROM messages WHERE jid = $1 AND sender_type='client'",
       [sender]
     );
     msgCount = 
parseInt(countRes.rows[0].count);
   }     
    if (msgCount === 3) {
      await db.query(
        "UPDATE sessions SET group_id = 2 WHERE client_id = $1",
        [clientId]
      );
      console.log(`🚀 المستخدم ${sender} تم نقله إلى الجروب 2 بعد ${msgCount} رسائل`);
    }

  } catch (err) {
    console.error("خطأ أثناء معالجة الرسالة:", err);
  };
 });

  
sock.ev.on("messages.update", async (updates) => {
    for (let { key, update } of updates) {
      if (update.messageStubType === 1) {
        await db.query("UPDATE messages SET is_deleted=true WHERE id=$1", [key.id]);
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

  // 1️⃣ جهّز الـ JID
  const finalJid = jid.includes("@s.whatsapp.net")
    ? jid : jid + "@s.whatsapp.net";

  // 2️⃣ ابحث عن client
  let clientRes = await db.query("SELECT id FROM clients WHERE phone=$1", [jid]);
  let clientId;
  if (clientRes.rowCount === 0) {
    const newClient = await db.query(
      "INSERT INTO clients (name, phone) VALUES ($1,$2) RETURNING id",
      ["Unknown", jid]
    );
    clientId = newClient.rows[0].id;
  } else {
    clientId = clientRes.rows[0].id;
  }

  // 3️⃣ ابحث عن session
  let sessionRes = await db.query(
    "SELECT id FROM sessions WHERE client_id=$1 AND wa_number_id=$2",
    [clientId, numberId]
  );

  let sessionId;
  if (sessionRes.rowCount === 0) {
    const newSession = await db.query(
      "INSERT INTO sessions (client_id, wa_number_id, group_id, status, created_at, updated_at, jid) VALUES ($1,$2,1,'unread',NOW(),NOW(),$3) RETURNING id",
      [clientId, numberId, jid]
    );
    sessionId = newSession.rows[0].id;
  } else {
    sessionId = sessionRes.rows[0].id;
  }

  // 4️⃣ أرسل الرسالة للواتساب
  await sock.sendMessage(finalJid, { text });

  // 5️⃣ خزّن الرسالة في DB
  const insertRes = await db.query(
    "INSERT INTO messages (session_id, sender_type, content, content_type, media_url, wa_number_id, is_deleted, created_at, jid) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8) RETURNING *",
    [sessionId, "agent", text, "text", null, numberId, false, jid]
  );

  console.log("✅ رسالة أُرسلت وخُزنت:", insertRes.rows[0]);

  // 6️⃣ أرجع الرسالة الجديدة للواجهة (حتى تظهر فورًا)
  return insertRes.rows[0];
}


function getClientStatus(numberId) {
  return clients[numberId] ? "connected" : "disconnected";
}

// Auto reconnect for all active numbers
async function reconnectAllActive() {
  try {
    const res = await db.query("SELECT id FROM wa_numbers WHERE status IN ('Active','Disconnected')");
    for (const row of res.rows) {
      console.log(`🔄 إعادة الاتصال بالرقم ${row.id}...`);
      await initClient(row.id);
    }
  } catch (err) {
    console.error("⚠️ خطأ أثناء إعادة الاتصال بالأرقام:", err);
  }
}

module.exports = { initClient, getQRForNumber, sendMessageToNumber, getClientStatus, reconnectAllActive };
