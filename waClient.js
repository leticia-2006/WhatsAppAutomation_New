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
sock.ev.on('messages.upsert', async (msg) => {
    const m = msg.messages[0]
    const data = {
        from: m.key.remoteJid,
        content: m.message?.conversation || m.message?.extendedTextMessage?.text
    }
    console.log("📩 New message:", data)

    // خزّن الرسالة في PostgreSQL
})
    
sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
        if (update.update.messageStubType === 68) { // delete event
            console.log("❌ Message deleted:", update.key.id)
            // حدث UPDATE في PostgreSQL → is_deleted = true
        }
    }
})

    return sock
}

module.exports = { connectWA }
