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

    client.on('disconnected', async (reason) => {
        console.log(`WhatsApp Client for number ${numberId} disconnected:`, reason);
        await db.query("UPDATE wa_numbers SET status=$1 WHERE id=$2", ["disconnected", numberId]);
    });
client.on('message', async (msg) => {
    console.log("New message:", msg.from, msg.body);

 try { 
    await db.query(
        `INSERT INTO messages (client_id, sender_role, content)
         VALUES ($1, $2, $3)`,
        [numberId, "client", msg.body] // sender_role = client لأنه جاي من الزبون
    );
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

    await client.sendMessage(to, { text: content });
}


module.exports = { createWhatsAppClient, getLatestQR, clients, sendMessageToNumber };
