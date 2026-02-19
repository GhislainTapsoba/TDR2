const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const app = express();
app.use(express.json());

let sock;
let qrCode = null;
let isConnected = false;
let isConnecting = false;

const logger = pino({ level: 'info' });

async function connectToWhatsApp() {
    if (isConnecting) {
        console.log('⏳ Connection already in progress...');
        return;
    }

    isConnecting = true;

    try {
        console.log('🔄 Starting WhatsApp connection...');
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger,
            version,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000,
            emitOwnEvents: true,
            markOnlineOnConnect: true
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                qrCode = qr;
                console.log('\n=================================');
                console.log('QR CODE GENERATED!');
                console.log('Scan this with WhatsApp:');
                console.log('=================================\n');
                qrcode.generate(qr, { small: true });
                console.log('\n=================================');
                console.log('Or get QR via: GET /qr');
                console.log('=================================\n');
            }

            if (connection === 'close') {
                isConnected = false;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.log('Connection closed:', lastDisconnect?.error?.message);
                console.log('Status code:', statusCode);
                console.log('Should reconnect:', shouldReconnect);

                if (shouldReconnect) {
                    console.log('🔄 Reconnecting in 5 seconds...');
                    isConnecting = false;
                    setTimeout(() => connectToWhatsApp(), 5000);
                } else {
                    console.log('❌ Logged out. Please restart and scan QR code again.');
                    isConnecting = false;
                }
            } else if (connection === 'open') {
                console.log('\n✅ WhatsApp connected successfully!');
                console.log('Phone number:', sock.user?.id);
                isConnected = true;
                qrCode = null;
                isConnecting = false;
            } else if (connection === 'connecting') {
                console.log('Connecting to WhatsApp...');
            }
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async (m) => {
            try {
                const message = m.messages[0];
                if (!message.key.fromMe && m.type === 'notify') {
                    const text = message.message?.conversation ||
                        message.message?.extendedTextMessage?.text ||
                        'Non-text message';
                    console.log('📨 Received:', text, 'from', message.key.remoteJid);
                }
            } catch (err) {
                console.error('Error handling message:', err.message);
            }
        });

    } catch (error) {
        console.error('❌ Error in connectToWhatsApp:', error.message);
        console.error('Full error:', error);
        isConnecting = false;
        console.log('🔄 Retrying in 10 seconds...');
        setTimeout(() => connectToWhatsApp(), 10000);
    }
}

// REST API endpoints
app.get('/status', (req, res) => {
    res.json({
        connected: isConnected,
        hasQR: qrCode !== null,
        user: sock?.user || null
    });
});

app.get('/qr', (req, res) => {
    if (qrCode) {
        res.json({
            qr: qrCode,
            message: 'Scan this QR code with WhatsApp'
        });
    } else if (isConnected) {
        res.json({
            message: 'Already connected',
            user: sock?.user
        });
    } else {
        res.json({
            message: 'No QR code available yet. Connection in progress...'
        });
    }
});

app.post('/send', async (req, res) => {
    const { to, message } = req.body;

    if (!isConnected) {
        return res.status(503).json({
            error: 'WhatsApp not connected',
            hint: 'Check /status or /qr endpoint'
        });
    }

    if (!to || !message) {
        return res.status(400).json({
            error: 'Missing required fields',
            required: { to: 'phone number', message: 'text' }
        });
    }

    try {
        // Format: remove all non-digits, add @s.whatsapp.net
        const jid = to.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        await sock.sendMessage(jid, { text: message });

        res.json({
            success: true,
            message: 'Message sent',
            to: jid
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            error: error.message,
            hint: 'Make sure the number is valid and registered on WhatsApp'
        });
    }
});

app.get('/', (req, res) => {
    res.json({
        name: 'TeamProject WhatsApp Bot',
        status: isConnected ? 'connected' : 'disconnected',
        user: sock?.user || null,
        endpoints: {
            status: 'GET /status - Check connection status',
            qr: 'GET /qr - Get QR code for pairing',
            send: 'POST /send - Send message (body: {to, message})'
        }
    });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 WhatsApp API Server started on port ${PORT}`);
    console.log(`📡 Endpoints:`);
    console.log(`   - GET  http://localhost:${PORT}/status`);
    console.log(`   - GET  http://localhost:${PORT}/qr`);
    console.log(`   - POST http://localhost:${PORT}/send\n`);

    connectToWhatsApp();
});