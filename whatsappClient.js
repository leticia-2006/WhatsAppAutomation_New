const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const db = require('./db.js');

// نخزن QR لكل رقم هنا
let latestQRs = {};
let clients = {}

// دالة لإنشاء عميل WhatsApp لكل رقم
function createWhatsAppClient(clientId) {
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

    client.on('ready', () => {
        console.log(`WhatsApp Client ${clientId} is ready!`);
    });

    client.on('auth-failure', msg => {
        console.error(`Authentication failure for ${clientId}:`, msg);
    });

    client.on('disconnected', reason => {
        console.log(`Client ${clientId} disconnected:`, reason);
    });
client.on('message', async (msg) => {
    console.log("New message:", msg.from, msg.body);

 try { 
    await db.query(
        `INSERT INTO messages (client_id, sender_role, content)
         VALUES ($1, $2, $3)`,
        ["clientId", "client", msg.body] // sender_role = client لأنه جاي من الزبون
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



// مثال: إنشاء عميل واحد باسم client1
const client1 = createWhatsAppClient("client1");

module.exports = { createWhatsAppClient, getLatestQR, clients, client1 };
