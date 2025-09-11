const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const db = require('./db.js');

// نخزن QR لكل رقم هنا
let latestQRs = {};
let clients = {};

// دالة لإنشاء عميل WhatsApp لكل رقم
function createWhatsAppClient(numberId, clientId) {
    const client = new Client({
        authStrategy: new LocalAuth({ clientId }),
        puppeteer: { headless: true }
    });

    // حدث توليد QR
    client.on('qr', (qr) => {
        latestQRs[clientId] = qr;
        console.log(`QR Code generated for ${clientId}`);
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', async() => {
        console.log(`WhatsApp Client for number ${numberId} is ready!`);
        await db.query("UPDATE wa_numbers SET status=$1 WHERE id=$2", ["active", numberId]);
    });

    client.on('disconnected', async () => {
        console.log(`WhatsApp session for ${numberId} disconnected.
        Reconnecting...`);
        initwhatsappClient(numberId);
    });
client.on('message', async (msg) => {
    console.log("New message:", msg.from, msg.body);

 try { 
  const session = await db.query(
  "SELECT id FROM sessions WHERE wa_number_id=$1 ORDER BY created_at DESC LIMIT 1",
  [numberId]
);

if (session.rows.length) {
  const sessionId = session.rows[0].id;

 await db.query(
    `INSERT INTO messages (session_id, sender_role, content)  
     VALUES ($1, $2, $3)`,
    [sessionId, "client", msg.body]
  );
  }
} catch (err) {
     console.error("Error saving message:", err);
     }
 });
    
    client.initialize();
    clients[clientId] = client;
    return client;
}

// دالة للحصول على آخر QR لكل رقم
function getLatestQR(clientId) {
    return latestQRs[clientId] || null;
}

async function sendMessageToNumber(numberId, to, content) {
    const clientKey = "client_" + numberId;
    const client = clients[clientKey];
    if (!client) throw new Error("Client not initialized");

    await client.sendMessage(to, content);
}


module.exports = { createWhatsAppClient, getLatestQR, clients, sendMessageToNumber };
