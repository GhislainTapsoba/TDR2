const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const express = require('express');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const app = express();
app.use(express.json());

let sock;
let qrCode = null;
let isConnected = false;

const logger = pino({ level: 'silent' });

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCode = qr;
            console.log('QR Code generated. Access /qr to view it');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            isConnected = false;
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('WhatsApp connected successfully!');
            isConnected = true;
            qrCode = null;
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0];
        if (!message.key.fromMe && m.type === 'notify') {
            console.log('Received message:', message.message?.conversation || message.message?.extendedTextMessage?.text);
        }
    });
}

// REST API endpoints
app.get('/status', (req, res) => {
    res.json({
        connected: isConnected,
        hasQR: qrCode !== null
    });
});

app.get('/qr', (req, res) => {
    if (qrCode) {
        res.json({ qr: qrCode });
    } else if (isConnected) {
        res.json({ message: 'Already connected' });
    } else {
        res.json({ message: 'No QR code available yet' });
    }
});

app.post('/send', async (req, res) => {
    const { to, message } = req.body;

    if (!isConnected) {
        return res.status(503).json({ error: 'WhatsApp not connected' });
    }

    if (!to || !message) {
        return res.status(400).json({ error: 'Missing "to" or "message" field' });
    }

    try {
        // Format number: remove + and add @s.whatsapp.net
        const jid = to.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        
        await sock.sendMessage(jid, { text: message });
        res.json({ success: true, message: 'Message sent' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.json({
        name: 'TeamProject WhatsApp Bot',
        status: isConnected ? 'connected' : 'disconnected',
        endpoints: {
            status: 'GET /status',
            qr: 'GET /qr',
            send: 'POST /send (body: {to, message})'
        }
    });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`WhatsApp API running on port ${PORT}`);
    connectToWhatsApp();
});
