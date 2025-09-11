const makeWASocket = require('@whiskeysockets/baileys').default
const { useMultiFileAuthState } = require('@whiskeysockets/baileys')
const path = require('path')

async function connectWA(numberId) {
    const { state, saveCreds } = await useMultiFileAuthState(
        path.join(__dirname, 'sessions', numberId)
    )

    const sock = makeWASocket({ auth: state })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', ({ connection }) => {
        if (connection === 'open') {
            console.log(`✅ WhatsApp connected: ${numberId}`)
        }
        if (connection === 'close') {
            console.log(`❌ WhatsApp disconnected: ${numberId}`)
        }
    })

    sock.ev.on('messages.upsert', (msg) => {
        console.log("📩 New message:", msg)
        // هنا تقدر تخزن الرسائل في PostgreSQL
    })

    return sock
}

module.exports = { connectWA }
