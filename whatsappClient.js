const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let latestQR = {};

// تفعيل LocalAuth لحفظ الجلسات على السيرفر
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "client1" // يمكن إضافة clientId لكل رقم
    }),
    puppeteer: { headless: true }
});

// حدث توليد QR Code عند إضافة رقم جديد فقط
client.on('qr', (qr) => {
    const currentNumberId = 'client1';
    latestQRs[currentNumberId] = qr;
    console.log('QR Code generated for', currentNumberId);
    qrcode.generate(qr, { small: true }); 
});

// حدث الجلسة جاهزة
client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

// فشل المصادقة
client.on('auth-failure', msg => {
    console.error('Authentication failure:', msg);
});

// فصل الاتصال
client.on('disconnected', reason => {
    console.log('Client disconnected:',reason);
});

// بدء الجلسة
client.initialize();

module.exports = { client, getLatestQR };
