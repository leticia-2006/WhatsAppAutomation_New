const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let latestQR = {};

// تفعيل LocalAuth لحفظ الجلسات على السيرفر
function createWhatsAppClient(clientId) {
const client = new Client({
    authStrategy: new LocalAuth({clientId }),
    puppeteer: { headless: true }}); // يمكن إضافة clientId لكل رقم
}),

// حدث توليد QR Code عند إضافة رقم جديد فقط
client.on('qr', (qr) => {
    latestQRs[clientId] = qr;
    console.log('QR Code generated for ${clientId}`);
    qrcode.generate(qr, { small: true }); 
});

// حدث الجلسة جاهزة
client.on('ready', () => {
    console.log(`WhatsApp Client ${clientId} is ready!`);
});

// فشل المصادقة
client.on('auth-failure', msg => {
    console.error('Authentication failurfor ${clientId}:`, msg);
});

// فصل الاتصال
client.on('disconnected', reason => {
    console.log(`Client ${clientd} disconnected:`,reason);
});

client.initialize();
return client;
}

function getLatestQR(clientId) {
    return latestQRs[clientId] || null;
}
const client1 = createWhatsAppClient("client1")
// بدء الجلسة
client.initialize();

module.exports = { client, getLatestQR };
