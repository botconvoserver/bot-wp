const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
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

app.use(express.json());
app.use(express.static('public'));

// ============ CONFIGURATION ============
const OWNER_NUMBER = "918154980144@c.us";
const BOT_NAME = "9MAN-X-YAMDHUD";
const PREFIX = ".";

// Store active sessions
let activeSessions = new Map();

// ============ IMPROVED PAIRING FUNCTION ============
async function createBotSession(phoneNumber, res) {
    const sessionId = `session_${phoneNumber}_${Date.now()}`;
    const sessionDir = path.join(__dirname, 'sessions', sessionId);
    
    console.log(`\n🔵 [${new Date().toLocaleTimeString()}] Starting session for: ${phoneNumber}`);
    
    try {
        // Clean previous session if exists
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
        const existingSession = [...activeSessions.keys()].find(key => key.includes(cleanNumber));
        if (existingSession) {
            console.log(`🧹 Cleaning existing session for ${cleanNumber}`);
            const oldSession = activeSessions.get(existingSession);
            if (oldSession) await oldSession.logout().catch(() => {});
            activeSessions.delete(existingSession);
        }
        
        // Ensure fresh directory
        await fs.remove(sessionDir).catch(() => {});
        await fs.ensureDir(sessionDir);
        
        // Get auth state
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();
        
        console.log(`📡 Baileys version: ${version.join('.')}`);
        
        // Create socket with CORRECT pairing configuration
        const sock = makeWASocket({
            version: version,
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: Browsers.ubuntu("Chrome"),
            syncFullHistory: false,
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: false,
            patchMessageBeforeSending: (msg) => msg,
            shouldSyncHistoryMessage: () => false,
            getMessage: async () => undefined
        });
        
        // Store session
        activeSessions.set(sessionId, { sock, dir: sessionDir, number: cleanNumber });
        
        // ============ CONNECTION UPDATE HANDLER ============
        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            console.log(`📡 Connection update: ${connection || 'unknown'}`);
            
            if (qr) {
                console.log("📱 QR Code received (fallback method)");
            }
            
            if (connection === "open") {
                console.log(`✅✅✅ CONNECTED SUCCESSFULLY! ✅✅✅`);
                console.log(`📱 User: ${sock.user.id}`);
                
                // Send success message
                await delay(2000);
                const userJid = `${cleanNumber}@s.whatsapp.net`;
                
                try {
                    await sock.sendMessage(userJid, {
                        text: `✅ *${BOT_NAME}* connected successfully!\n\n📱 Your number: ${cleanNumber}\n🎯 Command prefix: ${PREFIX}\n📋 Type *${PREFIX}menu* to see all commands\n\n👑 Made by YAMDHUD`
                    });
                    
                    // Send creds file
                    const credsPath = path.join(sessionDir, 'creds.json');
                    if (fs.existsSync(credsPath)) {
                        await sock.sendMessage(userJid, {
                            document: fs.readFileSync(credsPath),
                            fileName: "creds.json",
                            mimetype: "application/json",
                            caption: "🔐 Your authentication file. Save it safely!"
                        });
                    }
                } catch (err) {
                    console.log("Could not send welcome message:", err.message);
                }
                
                if (res) {
                    res.json({ status: true, code: "ALREADY_CONNECTED", message: "Bot connected successfully!" });
                }
            }
            
            if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(`❌ Connection closed. Code: ${statusCode}`);
                
                if (statusCode !== DisconnectReason.loggedOut) {
                    console.log("🔄 Will auto-reconnect...");
                    // Cleanup old session
                    setTimeout(() => {
                        activeSessions.delete(sessionId);
                        fs.remove(sessionDir).catch(() => {});
                    }, 5000);
                } else {
                    console.log("🚪 Logged out by user");
                    activeSessions.delete(sessionId);
                    fs.remove(sessionDir).catch(() => {});
                }
            }
        });
        
        // ============ CREDENTIALS UPDATE ============
        sock.ev.on("creds.update", async (creds) => {
            console.log("💾 Saving credentials...");
            await saveCreds();
        });
        
        // ============ MESSAGES HANDLER ============
        setupMessageHandler(sock);
        
        // ============ REQUEST PAIRING CODE ============
        await delay(1000);
        
        if (!sock.authState.creds.registered) {
            console.log(`🔑 Requesting pairing code for: ${cleanNumber}`);
            
            try {
                // CORRECT WAY to request pairing code
                const code = await sock.requestPairingCode(cleanNumber);
                console.log(`✅ Pairing code generated: ${code}`);
                
                if (res) {
                    res.json({ 
                        status: true, 
                        code: code,
                        message: "Code generated! Enter in WhatsApp within 1 minute."
                    });
                }
            } catch (pairError) {
                console.error("❌ Pairing request failed:", pairError);
                
                // Try alternative method
                try {
                    console.log("🔄 Trying alternative pairing method...");
                    const code = await sock.requestPairingCode(cleanNumber);
                    if (res) {
                        res.json({ status: true, code: code, message: "Code generated (alt method)!" });
                    }
                } catch (altError) {
                    console.error("❌ Alt method also failed:", altError);
                    if (res) {
                        res.json({ 
                            status: false, 
                            message: "Failed to generate code. WhatsApp might be blocking the request. Try after 5 minutes."
                        });
                    }
                }
            }
        } else {
            console.log("Already registered, skipping pairing");
            if (res) {
                res.json({ status: true, message: "Already connected! Checking..." });
            }
        }
        
        // Auto cleanup after 2 minutes if not connected
        setTimeout(async () => {
            if (!sock.user && activeSessions.has(sessionId)) {
                console.log(`🧹 Cleaning up inactive session: ${sessionId}`);
                await sock.logout().catch(() => {});
                activeSessions.delete(sessionId);
                fs.remove(sessionDir).catch(() => {});
            }
        }, 120000);
        
    } catch (error) {
        console.error("💥 Fatal error:", error);
        if (res) {
            res.json({ status: false, message: "Server error: " + error.message });
        }
    }
}

// ============ MESSAGE HANDLER ============
async function setupMessageHandler(sock) {
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        let text = "";
        if (msg.message.conversation) text = msg.message.conversation;
        else if (msg.message.extendedTextMessage?.text) text = msg.message.extendedTextMessage.text;
        else if (msg.message.imageMessage?.caption) text = msg.message.imageMessage.caption;
        else if (msg.message.videoMessage?.caption) text = msg.message.videoMessage.caption;
        
        if (!text) return;
        
        if (!text.startsWith(PREFIX)) return;
        
        const [cmd, ...args] = text.slice(PREFIX.length).trim().split(" ");
        const command = cmd.toLowerCase();
        const chatId = msg.key.remoteJid;
        const sender = chatId.endsWith("@g.us") ? msg.key.participant : chatId;
        
        console.log(`📨 Command: ${command} from ${sender?.split("@")[0]}`);
        
        try {
            // MENU
            if (command === "menu" || command === "help") {
                const menu = `╔════════════════════════╗
║  🤖 *${BOT_NAME}*  🤖
╚════════════════════════╝

╭─「 📋 COMMANDS 」
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
│ 🔧 *UTILS*
│ ├◈ ${PREFIX}ping
│ ├◈ ${PREFIX}qr <text>
│ ├◈ ${PREFIX}calc <eq>
│
╰─────────────●●►

👑 *Owner:* YAMDHUD
💡 *${PREFIX}ping* - Check bot status`;
                
                await sock.sendMessage(chatId, { text: menu });
            }
            
            // PING
            else if (command === "ping") {
                const start = Date.now();
                await sock.sendMessage(chatId, { text: "🏓 Pong!" });
                const end = Date.now();
                await sock.sendMessage(chatId, { text: `Latency: ${end - start}ms` });
            }
            
            // STICKER
            else if (command === "sticker" || command === "s") {
                const media = msg.message.imageMessage || msg.message.videoMessage;
                if (media) {
                    const stream = await downloadContentFromMessage(media, msg.message.imageMessage ? 'image' : 'video');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
                    await sock.sendMessage(chatId, { sticker: buffer });
                } else {
                    await sock.sendMessage(chatId, { text: `📌 Reply to an image/video with ${PREFIX}sticker` });
                }
            }
            
            // HUG
            else if (command === "hug") {
                const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                if (mentioned) {
                    await sock.sendMessage(chatId, { 
                        text: `🤗 @${sender.split("@")[0]} hugged @${mentioned.split("@")[0]}! 💕`,
                        mentions: [sender, mentioned]
                    });
                } else {
                    await sock.sendMessage(chatId, { text: `🤗 @${sender.split("@")[0]} sends a hug!`, mentions: [sender] });
                }
            }
            
            // KISS
            else if (command === "kiss") {
                const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                if (mentioned) {
                    await sock.sendMessage(chatId, { 
                        text: `😘 @${sender.split("@")[0]} kissed @${mentioned.split("@")[0]}! 💋`,
                        mentions: [sender, mentioned]
                    });
                } else {
                    await sock.sendMessage(chatId, { text: `😘 @${sender.split("@")[0]} blows a kiss!`, mentions: [sender] });
                }
            }
            
            // YT VIDEO
            else if (command === "ytv" && args[0]) {
                await sock.sendMessage(chatId, { text: "⏬ Downloading video..." });
                try {
                    const info = await ytdl.getInfo(args[0]);
                    const format = ytdl.chooseFormat(info.formats, { quality: '18' });
                    await sock.sendMessage(chatId, { video: { url: format.url }, caption: info.videoDetails.title });
                } catch (err) {
                    await sock.sendMessage(chatId, { text: "❌ Download failed!" });
                }
            }
            
            // YT AUDIO
            else if (command === "yta" && args[0]) {
                await sock.sendMessage(chatId, { text: "⏬ Downloading audio..." });
                try {
                    const info = await ytdl.getInfo(args[0]);
                    const format = ytdl.chooseFormat(info.formats, { quality: '140' });
                    await sock.sendMessage(chatId, { audio: { url: format.url }, mimetype: 'audio/mpeg' });
                } catch (err) {
                    await sock.sendMessage(chatId, { text: "❌ Download failed!" });
                }
            }
            
            // GROUP INFO
            else if (command === "groupinfo" && chatId.endsWith("@g.us")) {
                const metadata = await sock.groupMetadata(chatId);
                await sock.sendMessage(chatId, {
                    text: `📊 *GROUP INFO*\n\nName: ${metadata.subject}\nMembers: ${metadata.participants.length}\nOwner: @${metadata.owner?.split("@")[0]}`,
                    mentions: [metadata.owner]
                });
            }
            
            // TAG ALL
            else if (command === "tagall" && chatId.endsWith("@g.us")) {
                const metadata = await sock.groupMetadata(chatId);
                const mentions = metadata.participants.map(p => p.id);
                await sock.sendMessage(chatId, { text: mentions.map(m => `@${m.split("@")[0]}`).join("\n"), mentions });
            }
            
            // QR CODE
            else if (command === "qr" && args[0]) {
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(args.join(" "))}`;
                await sock.sendMessage(chatId, { image: { url: qrUrl } });
            }
            
            // CALCULATOR
            else if (command === "calc" && args[0]) {
                try {
                    const result = eval(args.join(" "));
                    await sock.sendMessage(chatId, { text: `Result: ${result}` });
                } catch (err) {
                    await sock.sendMessage(chatId, { text: "Invalid expression!" });
                }
            }
            
        } catch (err) {
            console.error("Command error:", err);
            await sock.sendMessage(chatId, { text: "❌ Command failed!" });
        }
    });
}

// ============ EXPRESS ROUTES ============
app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${BOT_NAME} - WhatsApp Bot</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #075e54 0%, #128C7E 100%);
                    min-height: 100vh;
                    padding: 20px;
                }
                .card {
                    max-width: 500px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 32px;
                    padding: 40px 24px;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                }
                h1 { color: #075e54; margin-bottom: 8px; }
                .sub { color: #666; margin-bottom: 32px; font-size: 14px; }
                input {
                    width: 100%;
                    padding: 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 16px;
                    font-size: 16px;
                    text-align: center;
                    margin-bottom: 16px;
                }
                input:focus { outline: none; border-color: #25d366; }
                button {
                    width: 100%;
                    padding: 16px;
                    background: #25d366;
                    color: white;
                    border: none;
                    border-radius: 16px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                }
                button:hover { background: #128C7E; transform: translateY(-2px); }
                .code-box {
                    margin-top: 24px;
                    padding: 20px;
                    background: #f0fdf4;
                    border-radius: 16px;
                    display: none;
                }
                .code {
                    font-size: 48px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    color: #075e54;
                    font-family: monospace;
                }
                .status {
                    margin-top: 16px;
                    padding: 12px;
                    border-radius: 12px;
                    font-size: 14px;
                    display: none;
                }
                .success { background: #d1fae5; color: #065f46; display: block; }
                .error { background: #fee2e2; color: #991b1b; display: block; }
                .info { background: #dbeafe; color: #1e40af; display: block; }
                .steps {
                    text-align: left;
                    margin-top: 24px;
                    padding: 16px;
                    background: #f9fafb;
                    border-radius: 16px;
                    font-size: 13px;
                }
                .steps h4 { color: #075e54; margin-bottom: 12px; }
                .steps p { margin: 8px 0; color: #4b5563; }
                .footer { margin-top: 24px; font-size: 12px; color: #9ca3af; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🤖 ${BOT_NAME}</h1>
                <div class="sub">50+ Commands | WhatsApp Bot</div>
                
                <input type="tel" id="phone" placeholder="Enter 10-digit number" />
                <button onclick="getCode()">🔑 Generate Pairing Code</button>
                
                <div id="codeBox" class="code-box">
                    <div style="margin-bottom: 12px;">✨ Your 6-digit code:</div>
                    <div id="code" class="code"></div>
                    <p style="margin-top: 16px; font-size: 12px;">
                        ⏰ Valid for 1 minute<br>
                        📱 WhatsApp → Settings → Linked Devices → Link with phone number
                    </p>
                </div>
                
                <div id="status"></div>
                
                <div class="steps">
                    <h4>📌 How to connect:</h4>
                    <p>1️⃣ Enter your 10-digit number (without 91)</p>
                    <p>2️⃣ Click Generate Code</p>
                    <p>3️⃣ Open WhatsApp → Settings → Linked Devices</p>
                    <p>4️⃣ Tap "Link with phone number"</p>
                    <p>5️⃣ Enter the code → Done!</p>
                    <p>6️⃣ Type <b>.menu</b> to see commands</p>
                </div>
                
                <div class="footer">
                    Made with ❤️ by YAMDHUD
                </div>
            </div>
            
            <script>
                async function getCode() {
                    let num = document.getElementById('phone').value;
                    if (!num) {
                        showStatus('❌ Enter your number!', 'error');
                        return;
                    }
                    
                    num = num.replace(/[^0-9]/g, '');
                    if (num.length !== 10) {
                        showStatus('❌ Enter valid 10-digit number!', 'error');
                        return;
                    }
                    
                    showStatus('⏳ Generating code...', 'info');
                    document.getElementById('codeBox').style.display = 'none';
                    
                    try {
                        const res = await fetch('/get-code?num=' + num);
                        const data = await res.json();
                        
                        if (data.status && data.code) {
                            document.getElementById('code').innerText = data.code;
                            document.getElementById('codeBox').style.display = 'block';
                            showStatus('✅ Code generated! Enter in WhatsApp now.', 'success');
                            
                            setTimeout(() => {
                                document.getElementById('codeBox').style.display = 'none';
                            }, 60000);
                        } else {
                            showStatus('❌ ' + (data.message || 'Failed! Try again.'), 'error');
                        }
                    } catch (err) {
                        showStatus('❌ Network error! Check connection.', 'error');
                    }
                }
                
                function showStatus(msg, type) {
                    const div = document.getElementById('status');
                    div.innerHTML = '<div class="' + type + '">' + msg + '</div>';
                    setTimeout(() => { div.innerHTML = ''; }, 8000);
                }
            </script>
        </body>
        </html>
    `);
});

app.get("/get-code", async (req, res) => {
    let num = req.query.num;
    if (!num) {
        return res.json({ status: false, message: "Number required!" });
    }
    
    num = num.replace(/[^0-9]/g, '');
    if (num.length < 10) {
        return res.json({ status: false, message: "Invalid number! Enter 10 digits." });
    }
    
    // Add country code if not present
    if (!num.startsWith('91')) {
        num = '91' + num;
    }
    
    console.log(`\n🔵 New pairing request for: ${num}`);
    await createBotSession(num, res);
});

// Health check
app.get("/health", (req, res) => {
    res.json({ 
        status: "online", 
        uptime: process.uptime(),
        sessions: activeSessions.size,
        bot: BOT_NAME
    });
});

app.listen(port, () => {
    console.log(`\n🚀 ${BOT_NAME} is running!`);
    console.log(`📍 http://localhost:${port}`);
    console.log(`📱 Owner: ${OWNER_NUMBER}`);
    console.log(`🎯 Prefix: ${PREFIX}`);
    console.log(`💚 Health: http://localhost:${port}/health\n`);
});
