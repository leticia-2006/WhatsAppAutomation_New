const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys");
const db = require("./db");
const path = require("path");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const { console } = require("inspector");


const clients = {};
const qrCodes = {};

async function initClient(numberId) {
  if (clients[numberId]) {
    console.log(`⚠️ Client ${numberId} already exists, skipping init`);
    return;
  }
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, `auth_info/${numberId}`));
  const { version } = await fetchLatestBaileysVersion();
  
  const pino = require("pino");
  const sock = makeWASocket({
  version,
  auth: state,
  printQRInTerminal: false,
  browser: ["MyApp", "Chrome", "10.0"],
  keepAliveIntervalMs: 30000,  // ✅ يمنع غلق الجلسة بعد الخمول
  markOnlineOnConnect: true,
  connectTimeoutMs: 60000,
  logger: pino({ level: "debug" }), // ✅
});
  clients[numberId] = sock;
  sock.ev.on("connection.update", async (update) => {
  const { qr, connection, lastDisconnect } = update;

  if (qr) {
    qrCodes[numberId] = qr;
    console.log(`📌 QR ready for number ${numberId}`);
  }

  if (connection === "open") {
    console.log(`✅ Number ${numberId} connected`);
    try {
      await db.query("UPDATE wa_numbers SET status=$1 WHERE id=$2", ["Active", numberId]);
    } catch (err) {
      console.error("Error updating number status:", err);
    }
  }

 if (connection === "close") {
  const statusCode = lastDisconnect?.error?.output?.statusCode;
  const conflict = lastDisconnect?.error?.output?.payload?.content || lastDisconnect?.error?.content;
  const reason =  Array.isArray(conflict) ? conflict[0]?.attrs.type : undefined;

  console.log(`❌ Connection closed for ${numberId}, code:`, statusCode, "reason:", reason);

  if(statusCode === 515) {
    console.log("515= soft restart after pairing"); 
    if (clients[numberId]) {
      try { 
        clients[numberId].end();
      } catch {}
      delete clients[numberId];}
      setTimeout(() => initClient(numberId), 1500);
    return;
  }
if (statusCode === 401 &&  reason === "device_removed") { 

  console.log("Device removed by Whatsapp → deleting auth");
  try {
      fs.rmSync(
        path.join(__dirname, `auth_info/${numberId}`),
        { recursive: true, force: true }
      );
    } catch {} 
    delete clients[numberId];
    delete qrCodes[numberId];
    await db.query("UPDATE wa_numbers SET status=$1 WHERE id=$2", 
      ["Disconnected", numberId]);
    return;
  }

// 🔴 Logout نهائي
  if (statusCode === DisconnectReason.loggedOut ) {
    console.log("🚪 Logged out → delete auth");
try {
    fs.rmSync(
      path.join(__dirname, `auth_info/${numberId}`),
      { recursive: true, force: true }
    );
  } catch {} 
  if (clients[numberId]) {
    try {
      clients[numberId].end();
    } catch {}

    delete clients[numberId];}
    delete qrCodes[numberId];
    return ;
  }

  // 🟢 515 / 408 / أي خطأ آخر → Restart
  console.log("Close without automatic restart");
}
});
  function normalizeJid(msg) {
  // حاول أولاً الرقم الحقيقي من peer_recipient_pn
  if (msg?.key?.participantPn) return msg.key.participantPn;
  if (msg?.message?.contextInfo?.participantPn) return msg.message.contextInfo.participantPn;
  if (msg?.message?.peer_recipient_pn) return msg.message.peer_recipient_pn;

  // fallback
  let jid = msg.key.participant || msg.key.remoteJid;
  if (!jid) return null;

  // إذا كان لا يحتوي على @s.whatsapp.net، أضفها
  return jid.includes("@s.whatsapp.net") ? jid : jid.split("@")[0] + "@s.whatsapp.net";
  }
 sock.ev.on("creds.update", saveCreds);

 sock.ev.on("messages.upsert", async (m) => {
   console.log("Event messages.upsert Triggered");
  try {
    const msg = m.messages[0];
    console.log("Raw message object:", JSON.stringify(msg, null, 2));
    
    if (!msg?.message) return;
    if (msg.message.protocolMessage) {
      console.log("Ignored protocolMessage:", msg.message.protocolMessage.type);
      return
    }

    const isFromMe = msg.key.fromMe;
    const sender = normalizeJid(msg);

if (!sender) {
  console.log("⚠️ Invalid JID, ignoring message:", msg.key);
  return;
}

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
  const buffer = await downloadMediaMessage(msg, "buffer", {}, { logger: console, reuploadRequest: sock }
);
  const fileName = `${numberId}_${Date.now()}.jpg`;
  const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, buffer);
  mediaUrl = `${process.env.BASE_URL || "https://whatsappautomation-new-4fec.onrender.com"}/uploads/${fileName}`;
  text = "[📷 صورة]";
} else if (msg.message.videoMessage) {
  contentType = "video";
  const buffer = await downloadMediaMessage(msg, "buffer", {}, { logger: console, reuploadRequest: sock });
  const fileName = `${numberId}_${Date.now()}.mp4`;
  const filePath = path.join(__dirname, "..", "uploads", fileName);
  if (!fs.existsSync("./uploads")) {
    fs.mkdirSync("./uploads");
  }
  fs.writeFileSync(filePath, buffer);
  const BASE_URL = "http://localhost:5008";
  mediaUrl = `${BASE_URL}/uploads/${fileName}`;
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
    "INSERT INTO sessions (client_id, wa_number_id, group_id, status, created_at, updated_at, jid) VALUES ($1,$2,1,'unread',NOW(),NOW(),$3) RETURNING id",
    [clientId, numberId, sender]
  );
  sessionId = newSession.rows[0].id;
  console.log(`✅ New session created (${sessionId}) for number ${numberId}`);
} else {
  sessionId = sessionRes.rows[0].id;
}

// 1. خزّن الرسالة مرتبطة بالجلسة
const finalJid = sender.includes("@s.whatsapp.net") ? sender : sender + "@s.whatsapp.net";
const insertRes = await db.query(
  "INSERT INTO messages (wa_message_id, session_id, sender_type, content, content_type, media_url, wa_number_id, is_deleted, created_at, jid) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9) RETURNING id",
  [msg.key.id, sessionId, isFromMe ? "agent" : "client", text, contentType, mediaUrl, numberId, false, finalJid]
);
    console.log("تم تخزين الرسالة:", insertRes.rows[0].id);
    
// ⭐ إعادة الجلسة إلى unread عند رسالة جديدة من العميل
if (!isFromMe) {
  await db.query(
    "UPDATE sessions SET status='unread', updated_at=NOW() WHERE id=$1",
    [sessionId]
  );
   // ⭐ وأيضًا ضعها كـ unreplied حتى يراها في تبويب "بدون رد"
  await db.query(
  "UPDATE sessions SET status='unreplied', updated_at=NOW() WHERE id=$1",
  [sessionId]
  );
}
// 2. منطق الأتمتة (بعد 3 رسائل انتقل للجروب 2)
let msgCount = 0;
    if (!isFromMe) {
     const countRes = await db.query(
       "SELECT COUNT(*) FROM messages WHERE jid = $1 AND sender_type='client'",
       [sender]
     );
     msgCount = 
parseInt(countRes.rows[0].count);  
    if (msgCount >= 3) {
      await db.query(
        "UPDATE sessions SET group_id = 2 WHERE id = $1",
        [sessionId]
      );
      console.log(`🚀 المستخدم ${sender} تم نقله إلى الجروب 2 بعد ${msgCount} رسائل`);
    }
  }
 } catch (err) {
    console.error("خطأ أثناء معالجة الرسالة:", err);
  };
 });

  
sock.ev.on("messages.update", async (updates) => {
    for (let { key, update } of updates) {
      if (update.messageStubType === 1) {
         await db.query("UPDATE messages SET is_deleted=true WHERE wa_message_id=$1", [key.id]);
      }
    }
});
 
}


function getQRForNumber(numberId) {
  return qrCodes[numberId] || null;
}

async function sendMessageToNumber(numberId, jid, content) {
  const sock = clients[numberId];
  if (!sock) throw new Error(`⚠️ Client ${numberId} not initialized`);

  // تحقق أن الاتصال مفتوح فعلاً
  if (!sock.user || !sock.user.id) {
    console.warn(`⚠️ Client ${numberId} not authenticated or disconnected`);
    return { error: "Client not authenticated or disconnected" };
  }

  // ✅ تجهيز الـ JID الصحيح
  const finalJid = jid.includes("@s.whatsapp.net")
    ? jid
    : `${jid}@s.whatsapp.net`;

  // 🔍 طباعة بيانات مفيدة للتتبع
  console.log(`📤 Sending message to ${finalJid} via ${numberId}`);

  // 📨 إرسال الرسالة
  try {
    if (typeof content === "string") {
      await sock.sendMessage(finalJid, { text: content });
    } else if (content.url && content.type) {
      const mediaPath = path.join(__dirname, "uploads", path.basename(content.url));
      const mediaBuffer = fs.readFileSync(mediaPath); // ✅
      if (content.type === "image") {
        await sock.sendMessage(finalJid, { image: mediaBuffer });
      } else if (content.type === "video") {
        await sock.sendMessage(finalJid, { video: mediaBuffer });
      } else if (content.type === "audio") {
        await sock.sendMessage(finalJid, { audio: mediaBuffer });
      }
    }
  } catch (sendErr) {
    console.error(`❌ Failed to send message for ${numberId}:`, sendErr);
    return { error: sendErr.message };
  }

  // 📦 حفظ الرسالة في قاعدة البيانات
  const insertRes = await db.query(
    "INSERT INTO messages (session_id, sender_type, content, content_type, media_url, wa_number_id, is_deleted, created_at, jid) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8) RETURNING *",
    [
      (await getOrCreateSession(numberId, jid)),
      "agent",
      typeof content === "string" ? content : null,
      typeof content === "string" ? "text" : content.type,
      typeof content === "object" ? content.url : null,
      numberId,
      false,
      finalJid
    ]
  );

  console.log("✅ Message sent and saved:", insertRes.rows[0]);
  // ✅ عندما يرد الوكيل، لا يجب أن تبقى الجلسة unreplied
await db.query(
  "UPDATE sessions SET status='read', updated_at=NOW() WHERE id=$1",
  [await getOrCreateSession(numberId, finalJid)]
);
  return insertRes.rows[0];
}


function getClientStatus(numberId) {
  return clients[numberId] ? "connected" : "disconnected";
}

// Auto reconnect for all active numbers
/*async function reconnectAllActive() {
  try {
    const res = await db.query("SELECT id FROM wa_numbers WHERE status IN ('Active','Disconnected')");
    for (const row of res.rows) {
      console.log(`🔄 إعادة الاتصال بالرقم ${row.id}...`);
      await initClient(row.id);
    }
  } catch (err) {
    console.error("⚠️ خطأ أثناء إعادة الاتصال بالأرقام:", err);
  }
}*/
async function getOrCreateSession(numberId, jid) {
  const clientRes = await db.query("SELECT id FROM clients WHERE phone=$1", [jid]);
  let clientId;
  if (clientRes.rowCount === 0) {
    const newClient = await db.query(
      "INSERT INTO clients (name, phone) VALUES ($1,$2) RETURNING id",
      ["Unknown", finalJid]
    );
    clientId = newClient.rows[0].id;
  } else {
    clientId = clientRes.rows[0].id;
  }

  const sessionRes = await db.query(
    "SELECT id FROM sessions WHERE client_id=$1 AND wa_number_id=$2",
    [clientId, numberId]
  );

  if (sessionRes.rowCount > 0) return sessionRes.rows[0].id;

  const newSession = await db.query(
    "INSERT INTO sessions (client_id, wa_number_id, group_id, status, created_at, updated_at, jid) VALUES ($1,$2,1,'unread',NOW(),NOW(),$3) RETURNING id",
    [clientId, numberId, finalJid]
  );

  return newSession.rows[0].id;
}
/*setInterval(async () => {
  for (const [id, sock] of Object.entries(clients)) {
    if (!sock.user) {
      console.log(`💤 Client ${id} seems inactive. Restarting...`);
      await initClient(Number(id));
    }
  }
}, 1000 * 60 * 5);*/

module.exports = { initClient, getQRForNumber, sendMessageToNumber, getClientStatus, /*reconnectAllActive,*/ clients };
