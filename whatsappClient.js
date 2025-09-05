const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let latestQR = null;

// تفعيل LocalAuth لحفظ الجلسات على السيرفر
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "client1" // يمكن إضافة clientId لكل رقم
    }),
    puppeteer: { headless: true }
});


// حدث توليد QR Code
client.on('qr', (qr) => {
    latestQR = qr;
    console.log('QR Code generated. Scan it from frontend.');
    qrcode.generate(qr, { small: true }); // يعرض في الطرفية
});

// حدث الجلسة جاهزة
client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

client.on('auth-failure', msg => {
    console.error('Authentication failure:', msg);
});

client.on('disconnected', reason => {
    console.log('Client disconnected:',reason);
});

    client.initialize();

// بدء الجلسة
client.initialize();

module.exports = { client, latestQR };

