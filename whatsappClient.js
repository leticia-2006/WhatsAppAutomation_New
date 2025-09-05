const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// تفعيل LocalAuth لحفظ الجلسات على السيرفر
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "client1" // يمكن إضافة clientId لكل رقم
    }),
    puppeteer: { headless: true }
});
let latestQR = null;

// حدث توليد QR Code
client.on('qr', (qr) => {
    latestQR = qr;
    console.log('Scan this QR Code:');
    qrcode.generate(qr, { small: true }); // يعرض في الطرفية
});

// حدث الجلسة جاهزة
client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

// بدء الجلسة
client.initialize();

module.exports = { client, latestQR };

