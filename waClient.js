const makeWASocket = require("@whiskeysockets/baileys").default;    
const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys");    
const db = require("./db");    
const path = require("path");    
const { downloadMediaMessage } = require("@whiskeysockets/baileys");    
const fs = require("fs");    
const clients = {};    
const qrCodes = {};    
const initializing = new Set();   

function deleteAuthSession(numberId) {
  const authPath = path.join(__dirname, `auth_info/${numberId}`);

  if (fs.existsSync(authPath)) {
    fs.rmSync(authPath, { recursive: true, force: true });
    console.log("🗑️ auth_info deleted for", numberId);
  } else {
    console.log("ℹ️ auth_info not found for", numberId);
  }
}
async function initClient(numberId) {
    if (initializing.has(numberId)) {
        console.log("⛔ init already in progress for", numberId);
        return;
    }
    
    // ✅ تحقق إضافي: إذا كان العميل موجوداً ومتصل
    if (clients[numberId] && clients[numberId].user) {
        console.log(`✅ Client ${numberId} already connected (jid: ${clients[numberId].user.id})`);
        return;
    }
    
    initializing.add(numberId);

    try {
        console.log("🚀 Starting initClient for", numberId);
        const { state, saveCreds } = await useMultiFileAuthState(
            path.join(__dirname, `auth_info/${numberId}`)
        );
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "120.0.0.0"], // ⬅️ غيّر هذا
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000, // ⬅️ زيادة هذا
            logger: pino({ level: "debug" }), // ⬅️ غير إلى silent لتنظيف اللوج
            // ⬇️ أضف هذه الإعدادات الجديدة
            markOnlineOnConnect: true,
            syncFullHistory: false,
            generateHighQualityLinkPreview: false,
            linkPreviewImageThumbnailWidth: 192,
            getMessage: async (key) => {
                return {
                    conversation: "hello"
                }
            }
        });

        console.log("🧪 makeWASocket executed");
        clients[numberId] = sock;

        sock.ev.on("connection.update", async (update) => {
            console.log("🔍 WA UPDATE:", JSON.stringify(update, null, 2));
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                qrCodes[numberId] = qr;
                console.log("📸 QR generated for", numberId);
                
                // ⬇️ تحديث حالة قاعدة البيانات
                await db.query(
                    "UPDATE wa_numbers SET status='QR Ready' WHERE id=$1",
                    [numberId]
                );
            }

            if (connection === "open") {
                console.log(`✅ ${numberId} connected`);
                await db.query(
                    "UPDATE wa_numbers SET status='Active' WHERE id=$1",
                    [numberId]
                );
                delete qrCodes[numberId];
            }

            if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = shouldReconnectSocket(lastDisconnect);
                
                console.log("🔌 WA closed:", statusCode, "shouldReconnect:", shouldReconnect);

                // 🔄 منطق إعادة الاتصال المحسن
                if (shouldReconnect) {
                    console.log(`🔄 Reconnecting ${numberId} in 5s...`);
                    
                    // تنظيف الذاكرة
                    delete clients[numberId];
                    delete qrCodes[numberId];
                    initializing.delete(numberId);
                    
                    setTimeout(() => {
                        console.log(`🔄 Attempting reconnect for ${numberId}`);
                        initClient(numberId);
                    }, 5000);
                } 
                // ⚠️ حالة خاصة: 515 بعد الاقتران مباشرة
                else if (statusCode === 515 && qrCodes[numberId]) {
                    console.log("⚡ 515 after pairing - waiting for auto-reconnect");
                    // لا تفعل شيء، دع Baileys يعيد الاتصال تلقائياً
                }
                // 🚨 جلسة منتهية أو غير صالحة
                else if (statusCode === 401 || statusCode === DisconnectReason.loggedOut) {
                    console.log("🚨 Session invalid → need new QR");
                    
                    // تنظيف كامل
                    deleteAuthSession(numberId);
                    delete clients[numberId];
                    delete qrCodes[numberId];
                    initializing.delete(numberId);
                    
                    await db.query(
                        "UPDATE wa_numbers SET status='Disconnected' WHERE id=$1",
                        [numberId]
                    );
                }
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
  mediaUrl = `${process.env.BASE_URL || "https://whatsappautomation-new-4fec.onrender.com"}/uploads/${fileName}`;    
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
     
} finally {
    initializing.delete(numberId);
  }
}    
function shouldReconnectSocket(lastDisconnect) {
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    
    // ⚠️ الأخطاء التي لا تحتاج لإعادة اتصال
    const nonReconnectCodes = [
        401, // غير مصرح
        403, // محظور
        404, // غير موجود
        405, // غير مسموح
        406, // غير مقبول
        407, // مطلوب مصادقة الوكيل
        409, // تعارض
        410, // ذهب
        422, // كيان غير معالج
        423, // مقفل
        424, // فشل تبعية
        428, // شرط مطلوب
        429, // طلبات كثيرة جداً
        451, // غير متوفر لأسباب قانونية
    ];
    
    if (nonReconnectCodes.includes(statusCode)) {
        return false;
    }
    
    // 🔄 الأخطاء التي تحتاج لإعادة اتصال
    const reconnectCodes = [
        408, // انتهت المهلة
        500, // خطأ داخلي في الخادم
        502, // بوابة سيئة
        503, // الخدمة غير متوفرة
        504, // انتهت مهلة البوابة
        515, // خطأ في البث (Stream Errored) ⬅️ مهم!
    ];
    
    if (reconnectCodes.includes(statusCode)) {
        return true;
    }
    
    // ⚡ حالة الـ loggedOut من Baileys
    if (statusCode === DisconnectReason.loggedOut) {
        return false; // يحتاج QR جديد
    }
    
    // افتراضياً: حاول إعادة الاتصال
    return true;
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
  [await getOrCreateSession(numberId, jid)]    
);    
  return insertRes.rows[0];    
}    
    
    
function getClientStatus(numberId) {    
  return clients[numberId] ? "connected" : "disconnected";    
}    
    
// Auto reconnect for all active numbers    
async function reconnectAllActive() {
  const res = await db.query(
    "SELECT id FROM wa_numbers WHERE status='Active'"
  );

  for (const row of res.rows) {
    if (clients[row.id]) continue;
    if (initializing.has(row.id)) continue;
    if (qrCodes[row.id]) continue;

    await initClient(row.id);
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
/*setInterval(async () => {
  for (const sock of Object.values(clients)) {
    try {
      if (sock?.ws?.readyState === 1) {
        await sock.sendPresenceUpdate("available");
      }
    } catch (e) {
      console.log("⚠️ ping failed");
    }
  }
}, 1000 * 25);*/
/*setInterval(() => {
  for (const [id, sock] of Object.entries(clients)) {
    if (!sock || !sock.user) {
      console.log(`💤 Client ${id} inactive → reconnect`);
      initClient(Number(id));
    }
  }
}, 1000 * 60 * 5);  */
module.exports = { initClient, getQRForNumber, reconnectAllActive, sendMessageToNumber, getClientStatus, clients };    
