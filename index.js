const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    fetchLatestBaileysVersion,
    downloadContentFromMessage,
    Browsers
} = require("@whiskeysockets/baileys");
const express = require("express");
const fs = require("fs-extra");
const pino = require("pino");
const path = require("path");
const axios = require("axios");
const ytdl = require("ytdl-core");
const moment = require("moment");
const os = require("os");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// Owner configuration
const OWNER_NUMBER = "918154980144@c.us";
const BOT_NAME = "9MAN-X-YAMDHUD";
const PREFIX = ".";

// Store active connections with better management
let activeSockets = new Map();
let botStartTime = Date.now();

// ============ IMPROVED LOGGING ============
const logger = pino({ level: 'info' });

// ============ FIXED PAIRING WITH BETTER SESSION HANDLING ============
async function startPairing(phoneNumber, res) {
    const sessionID = `session_${phoneNumber}_${Date.now()}`;
    const sessionDir = path.join(__dirname, 'sessions', sessionID);
    
    console.log(`📱 Creating session for: ${phoneNumber}`);
    
    try {
        // Ensure session directory exists
        await fs.ensureDir(sessionDir);
        
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();
        
        console.log(`📡 Using Baileys version: ${version}`);

        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            logger: logger,
            browser: Browsers.macOS("Desktop"),
            markOnlineOnConnect: true,
            syncFullHistory: false,
            patchMessageBeforeSending: (message) => {
                const requiresPatch = !!(
                    message.buttonsMessage || 
                    message.templateMessage ||
                    message.listMessage
                );
                if (requiresPatch) {
                    message = {
                        viewOnceMessage: {
                            message: {
                                messageContextInfo: {
                                    deviceListMetadataVersion: 2,
                                    deviceListMetadata: {},
                                },
                                ...message,
                            },
                        },
                    };
                }
                return message;
            },
        });

        // Store socket
        activeSockets.set(sessionID, sock);

        // Handle connection updates properly
        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            console.log(`🔄 Connection update: ${connection}`);
            
            if (qr) {
                console.log("QR Code received (fallback method)");
            }

            if (connection === "open") {
                console.log("✅ WhatsApp Connected Successfully!");
                console.log(`📱 Connected as: ${sock.user.id}`);
                
                await delay(3000);
                
                const credsPath = path.join(sessionDir, 'creds.json');
                
                if (fs.existsSync(credsPath)) {
                    try {
                        const userJid = `${phoneNumber}@s.whatsapp.net`;
                        const credsData = fs.readFileSync(credsPath);
                        
                        await sock.sendMessage(userJid, {
                            document: credsData,
                            fileName: "creds.json",
                            mimetype: "application/json",
                            caption: `✅ *${BOT_NAME} - Successfully Connected!*\n\n📱 *Your Number:* ${phoneNumber}\n🎯 *Prefix:* ${PREFIX}\n📋 *Commands:* ${PREFIX}menu\n\n👑 *Made by YAMDHUD*`
                        });
                        
                        console.log(`✅ Creds file sent to ${phoneNumber}`);
                        
                        // Don't delete immediately - keep session alive
                        setTimeout(async () => {
                            try {
                                await sock.logout();
                                await fs.remove(sessionDir);
                                activeSockets.delete(sessionID);
                                console.log(`🧹 Cleaned up session: ${sessionID}`);
                            } catch (err) {
                                console.error("Cleanup error:", err);
                            }
                        }, 60000); // Keep alive for 1 minute
                        
                    } catch (sendError) {
                        console.error("Failed to send creds file:", sendError);
                    }
                }
            }

            if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                console.log(`❌ Connection closed. Status: ${statusCode}, Should reconnect: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    console.log("🔄 Attempting to reconnect in 5 seconds...");
                    await delay(5000);
                    // Reconnect logic
                    startPairing(phoneNumber, null).catch(console.error);
                } else {
                    console.log("🚪 Logged out, cleaning up session");
                    await fs.remove(sessionDir);
                    activeSockets.delete(sessionID);
                }
            }
        });

        // Handle credentials update
        sock.ev.on("creds.update", async (creds) => {
            console.log("🔄 Credentials updated, saving...");
            await saveCreds();
        });

        // Handle messages
        setupMessageHandler(sock);

        // Request pairing code if not registered
        if (!sock.authState.creds.registered) {
            const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
            console.log(`🔑 Requesting pairing code for: ${cleanNumber}`);
            
            try {
                await delay(2000);
                const code = await sock.requestPairingCode(cleanNumber);
                console.log(`✅ Pairing code generated: ${code}`);
                
                if (res) {
                    res.json({ 
                        status: true, 
                        code: code,
                        message: "Code generated successfully! Enter in WhatsApp within 30 seconds."
                    });
                }
            } catch (error) {
                console.error("❌ Pairing code error:", error);
                if (res) {
                    res.json({ 
                        status: false, 
                        message: "Failed to generate code: " + error.message 
                    });
                }
            }
        } else {
            console.log("Already registered, skipping pairing");
            if (res) {
                res.json({ 
                    status: true, 
                    message: "Already connected! Check your WhatsApp."
                });
            }
        }

    } catch (error) {
        console.error("Fatal error in startPairing:", error);
        if (res) {
            res.json({ 
                status: false, 
                message: "Server error: " + error.message 
            });
        }
    }
}

// ============ COMMAND HANDLER ============
async function handleCommand(sock, msg, command, args, sender) {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith("@g.us");
    const isOwner = sender === OWNER_NUMBER;
    
    try {
        // Menu Command
        if (command === "menu" || command === "gmenu") {
            const uptime = process.uptime();
            const totalMem = os.totalmem() / 1024 / 1024 / 1024;
            const freeMem = os.freemem() / 1024 / 1024 / 1024;
            const usedMem = totalMem - freeMem;
            
            const menuText = `╔══════════════════════════╗
║  🤖 *${BOT_NAME}* 🤖
╚══════════════════════════╝

╭─「 *BOT STATUS* 」
│🔹 *Uptime* : ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s
│🔹 *RAM*    : ${usedMem.toFixed(2)} / ${totalMem.toFixed(2)} GB
│🔹 *Prefix* : ${PREFIX}
╰─────────────●●►

╭─「 *COMMANDS* 」
│
│ 📥 *DOWNLOADER*
│ ├◈ ${PREFIX}ytv <url>
│ ├◈ ${PREFIX}yta <url>
│ ├◈ ${PREFIX}fb <url>
│ ├◈ ${PREFIX}ig <url>
│ ├◈ ${PREFIX}tiktok <url>
│
│ 🎨 *MEDIA*
│ ├◈ ${PREFIX}sticker
│ ├◈ ${PREFIX}s
│ ├◈ ${PREFIX}toimage
│
│ 👥 *GROUP*
│ ├◈ ${PREFIX}tagall
│ ├◈ ${PREFIX}admins
│ ├◈ ${PREFIX}groupinfo
│
│ 💝 *FUN*
│ ├◈ ${PREFIX}hug @user
│ ├◈ ${PREFIX}kiss @user
│ ├◈ ${PREFIX}slap @user
│
│ 🔧 *TOOLS*
│ ├◈ ${PREFIX}ping
│ ├◈ ${PREFIX}qr <text>
│ ├◈ ${PREFIX}calc <eq>
│
╰─────────────●●►

👑 *Owner:* YAMDHUD
💬 *${PREFIX}ping* - Check bot status`;

            await sock.sendMessage(chatId, { text: menuText });
        }
        
        // Ping command
        else if (command === "ping") {
            const start = Date.now();
            await sock.sendMessage(chatId, { text: "🏓 Pinging..." });
            const end = Date.now();
            await sock.sendMessage(chatId, { text: `*Pong!* 🏓\nLatency: ${end - start}ms\nBot: Active ✅` });
        }
        
        // Sticker command
        else if (command === "sticker" || command === "s") {
            if (msg.message.imageMessage) {
                const stream = await downloadContentFromMessage(msg.message.imageMessage, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                await sock.sendMessage(chatId, { sticker: buffer }, { quoted: msg });
            } else if (msg.message.videoMessage) {
                const stream = await downloadContentFromMessage(msg.message.videoMessage, 'video');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                await sock.sendMessage(chatId, { sticker: buffer }, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, { text: `📌 *Usage:* Reply to an image/video with ${PREFIX}sticker` });
            }
        }
        
        // Hug command
        else if (command === "hug") {
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (mentioned) {
                await sock.sendMessage(chatId, { 
                    text: `🤗 *@${sender.split("@")[0]}* hugged *@${mentioned.split("@")[0]}*! 💕`,
                    mentions: [sender, mentioned]
                });
            } else {
                await sock.sendMessage(chatId, { text: `🤗 *@${sender.split("@")[0]}* sends a hug to everyone!`, mentions: [sender] });
            }
        }
        
        // Kiss command
        else if (command === "kiss") {
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (mentioned) {
                await sock.sendMessage(chatId, { 
                    text: `😘 *@${sender.split("@")[0]}* kissed *@${mentioned.split("@")[0]}*! 💋`,
                    mentions: [sender, mentioned]
                });
            } else {
                await sock.sendMessage(chatId, { text: `😘 *@${sender.split("@")[0]}* blows a kiss! 💋`, mentions: [sender] });
            }
        }
        
        // Group info
        else if (command === "groupinfo" && isGroup) {
            const metadata = await sock.groupMetadata(chatId);
            await sock.sendMessage(chatId, {
                text: `📊 *GROUP INFO*\n\n*Name:* ${metadata.subject}\n*ID:* ${metadata.id}\n*Members:* ${metadata.participants.length}\n*Owner:* @${metadata.owner?.split("@")[0] || "Unknown"}`,
                mentions: [metadata.owner]
            });
        }
        
        // Tag all
        else if (command === "tagall" && isGroup) {
            const metadata = await sock.groupMetadata(chatId);
            let text = "📢 *ANNOUNCEMENT*\n\n";
            const mentions = metadata.participants.map(p => p.id);
            text += mentions.map(m => `@${m.split("@")[0]}`).join("\n");
            await sock.sendMessage(chatId, { text, mentions });
        }
        
        // Unknown command
        else if (!command.startsWith("_")) {
            // Ignore unknown commands
        }
        
    } catch (error) {
        console.error("Command error:", error);
        await sock.sendMessage(chatId, { text: "❌ Command failed! Try again." });
    }
}

// ============ MESSAGE HANDLER ============
async function setupMessageHandler(sock) {
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        let messageText = "";
        
        if (msg.message.conversation) messageText = msg.message.conversation;
        else if (msg.message.extendedTextMessage?.text) messageText = msg.message.extendedTextMessage.text;
        else if (msg.message.imageMessage?.caption) messageText = msg.message.imageMessage.caption;
        else if (msg.message.videoMessage?.caption) messageText = msg.message.videoMessage.caption;
        
        if (!messageText) return;
        
        const sender = msg.key.remoteJid.endsWith("@g.us") ? msg.key.participant : msg.key.remoteJid;
        
        if (!messageText.startsWith(PREFIX)) return;
        
        const [cmd, ...args] = messageText.slice(PREFIX.length).trim().split(" ");
        const command = cmd.toLowerCase();
        
        console.log(`📨 Command received: ${command} from ${sender.split("@")[0]}`);
        await handleCommand(sock, msg, command, args, sender);
    });
}

// ============ EXPRESS ROUTES ============
app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${BOT_NAME} - WhatsApp Bot</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background: linear-gradient(135deg, #075e54 0%, #128C7E 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 32px;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                    padding: 48px 32px;
                    max-width: 500px;
                    width: 100%;
                    text-align: center;
                }
                h1 {
                    color: #075e54;
                    font-size: 28px;
                    margin-bottom: 8px;
                }
                .subtitle {
                    color: #128C7E;
                    margin-bottom: 32px;
                    font-size: 14px;
                }
                input {
                    width: 100%;
                    padding: 16px;
                    font-size: 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 16px;
                    margin-bottom: 16px;
                    transition: all 0.3s;
                    text-align: center;
                }
                input:focus {
                    outline: none;
                    border-color: #25d366;
                }
                button {
                    background: #25d366;
                    color: white;
                    border: none;
                    padding: 16px 32px;
                    font-size: 16px;
                    font-weight: 600;
                    border-radius: 16px;
                    cursor: pointer;
                    width: 100%;
                    transition: all 0.3s;
                }
                button:hover {
                    background: #128C7E;
                    transform: translateY(-2px);
                }
                .code-container {
                    margin-top: 32px;
                    padding: 24px;
                    background: #f0fdf4;
                    border-radius: 16px;
                    display: none;
                    border: 2px solid #25d366;
                }
                .code-label {
                    font-size: 14px;
                    color: #166534;
                    margin-bottom: 12px;
                }
                .code {
                    font-size: 42px;
                    font-weight: bold;
                    color: #075e54;
                    letter-spacing: 8px;
                    font-family: monospace;
                    background: white;
                    padding: 16px;
                    border-radius: 12px;
                }
                .status {
                    margin-top: 20px;
                    padding: 12px;
                    border-radius: 12px;
                    font-size: 14px;
                    display: none;
                }
                .status.success {
                    display: block;
                    background: #d1fae5;
                    color: #065f46;
                }
                .status.error {
                    display: block;
                    background: #fee2e2;
                    color: #991b1b;
                }
                .status.info {
                    display: block;
                    background: #dbeafe;
                    color: #1e40af;
                }
                .footer {
                    margin-top: 32px;
                    font-size: 12px;
                    color: #9ca3af;
                }
                .step {
                    text-align: left;
                    background: #f9fafb;
                    padding: 16px;
                    border-radius: 12px;
                    margin-top: 20px;
                    font-size: 13px;
                }
                .step h4 {
                    color: #075e54;
                    margin-bottom: 8px;
                }
                .step p {
                    color: #4b5563;
                    line-height: 1.5;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 ${BOT_NAME}</h1>
                <div class="subtitle">WhatsApp Bot - 50+ Commands</div>
                
                <input type="tel" id="phone" placeholder="Enter Number (e.g., 918154980144)" />
                <button onclick="generateCode()">🔑 Generate Pairing Code</button>
                
                <div id="codeContainer" class="code-container">
                    <div class="code-label">✨ Your 6-Digit Code</div>
                    <div id="code" class="code"></div>
                    <p style="margin-top: 16px; font-size: 13px; color: #166534;">
                        ⏰ Code expires in 30 seconds<br>
                        📱 Open WhatsApp → Settings → Linked Devices → Link with phone number
                    </p>
                </div>
                
                <div id="status"></div>
                
                <div class="step">
                    <h4>📌 How to Connect:</h4>
                    <p>1️⃣ Enter your WhatsApp number with country code (91 for India)<br>
                    2️⃣ Click "Generate Pairing Code"<br>
                    3️⃣ Open WhatsApp → Settings → Linked Devices → Link with phone number<br>
                    4️⃣ Enter the 6-digit code within 30 seconds<br>
                    5️⃣ ✅ Connected! Use ${PREFIX}menu to see commands</p>
                </div>
                
                <div class="footer">
                    Made with ❤️ by YAMDHUD
                </div>
            </div>
            
            <script>
                let countdownInterval = null;
                
                async function generateCode() {
                    let phone = document.getElementById('phone').value;
                    
                    if (!phone) {
                        showStatus('❌ Please enter your WhatsApp number!', 'error');
                        return;
                    }
                    
                    phone = phone.replace(/[^0-9]/g, '');
                    
                    if (!phone.startsWith('91')) {
                        phone = '91' + phone;
                    }
                    
                    if (phone.length < 12) {
                        showStatus('❌ Invalid number! Use format: 91XXXXXXXXXX', 'error');
                        return;
                    }
                    
                    showStatus('⏳ Generating pairing code...', 'info');
                    document.getElementById('codeContainer').style.display = 'none';
                    
                    if (countdownInterval) clearInterval(countdownInterval);
                    
                    try {
                        const response = await fetch('/get-code?num=' + phone);
                        const data = await response.json();
                        
                        if (data.status && data.code) {
                            document.getElementById('code').innerText = data.code;
                            document.getElementById('codeContainer').style.display = 'block';
                            showStatus('✅ Code generated! Enter it in WhatsApp within 30 seconds.', 'success');
                            
                            let countdown = 30;
                            countdownInterval = setInterval(() => {
                                countdown--;
                                if (countdown <= 0) {
                                    clearInterval(countdownInterval);
                                    document.getElementById('codeContainer').style.display = 'none';
                                    showStatus('⏰ Code expired! Generate a new code.', 'info');
                                }
                            }, 1000);
                        } else {
                            showStatus('❌ Failed: ' + (data.message || 'Unknown error'), 'error');
                        }
                    } catch (error) {
                        showStatus('❌ Network error! Check your connection.', 'error');
                    }
                }
                
                function showStatus(message, type) {
                    const statusDiv = document.getElementById('status');
                    statusDiv.innerHTML = '<div class="status ' + type + '">' + message + '</div>';
                    setTimeout(() => {
                        statusDiv.innerHTML = '';
                    }, 10000);
                }
            </script>
        </body>
        </html>
    `);
});

app.get("/get-code", async (req, res) => {
    const num = req.query.num;
    if (!num) {
        return res.json({ status: false, message: "Number required!" });
    }
    await startPairing(num, res);
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ 
        status: "OK", 
        uptime: process.uptime(),
        activeSessions: activeSockets.size,
        botName: BOT_NAME
    });
});

// Start server
const server = app.listen(port, () => {
    console.log(`🚀 ${BOT_NAME} Bot running on port ${port}`);
    console.log(`📱 Owner: ${OWNER_NUMBER}`);
    console.log(`🎯 Prefix: ${PREFIX}`);
    console.log(`💚 Health check: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    for (let [id, sock] of activeSockets) {
        try {
            await sock.logout();
        } catch (e) {}
    }
    server.close(() => process.exit(0));
});
