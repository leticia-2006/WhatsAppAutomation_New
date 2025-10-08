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
  clients[numberId] = sock;
  await new Promise((resolve, reject) => {
  sock.ev.on("connection.update", async (update) => {
  const { qr, connection, lastDisconnect } = update;

  if (qr) {
    qrCodes[numberId] = qr; // خزّن QR
    console.log(`📌 QR ready for number ${numberId}`);
  }
 if (connection === "open") {
    console.log(`✅ Number ${numberId} connected`);
   // تحديث الحالة في DB
    try {
      await db.query("UPDATE wa_numbers SET status=$1 WHERE id=$2", ["Active", numberId]);
    } catch (err) {
      console.error("Error updating number status:", err);
    }
   resolve();
  }
 if (connection === "close") {
    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    if (shouldReconnect) {
      console.log("🔄 Reconnecting...");
      if (clients[numberId]?.ws) clients[numberId].ws.close();
      delete clients[numberId];
      setTimeout(() => initClient(numberId), 5000);
    } else { reject(new Error("Logged out"));}
    
  }
});

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
  const buffer = await downloadMediaMessage(msg, "buffer", {}, { logger: console, reuploadRequest: sock }
);
  const fileName = `${numberId}_${Date.now()}.jpg`;
  const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, buffer);
  mediaUrl = `/uploads/${fileName}`;
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
        "UPDATE sessions SET group_id = 2 WHERE client_id = $1",
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
 clients[numberId] = sock;
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
      const mediaPath = path.join(__dirname, "..", content.url.replace(/^\//, "")); 
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
async function getOrCreateSession(numberId, jid) {
  const clientRes = await db.query("SELECT id FROM clients WHERE phone=$1", [jid]);
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

  const sessionRes = await db.query(
    "SELECT id FROM sessions WHERE client_id=$1 AND wa_number_id=$2",
    [clientId, numberId]
  );

  if (sessionRes.rowCount > 0) return sessionRes.rows[0].id;

  const newSession = await db.query(
    "INSERT INTO sessions (client_id, wa_number_id, group_id, status, created_at, updated_at, jid) VALUES ($1,$2,1,'unread',NOW(),NOW(),$3) RETURNING id",
    [clientId, numberId, jid]
  );

  return newSession.rows[0].id;
}

module.exports = { initClient, getQRForNumber, sendMessageToNumber, getClientStatus, reconnectAllActive, clients };

