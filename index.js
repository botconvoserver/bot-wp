const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    fetchLatestBaileysVersion,
    downloadContentFromMessage
} = require("@whiskeysockets/baileys");
const express = require("express");
const fs = require("fs-extra");
const pino = require("pino");
const path = require("path");
const axios = require("axios");
const ytdl = require("ytdl-core");
const yts = require("yt-search");
const moment = require("moment");
const os = require("os");

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

// Owner configuration
const OWNER_NUMBER = "918154980144@c.us";
const BOT_NAME = "9MAN-X-YAMDHUD";
const PREFIX = ".";

// Store active connections
let activeSockets = new Map();
let botStartTime = Date.now();

// ============ COMMAND HANDLER ============
async function handleCommand(sock, msg, command, args, sender) {
    const chatId = msg.key.remoteJid;
    const isGroup = chatId.endsWith("@g.us");
    const isOwner = sender === OWNER_NUMBER;
    
    try {
        // ========== GENERAL COMMANDS ==========
        if (command === "menu" || command === "gmenu") {
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor(uptime / 3600) % 24;
            const minutes = Math.floor(uptime / 60) % 60;
            const seconds = Math.floor(uptime % 60);
            const totalMem = os.totalmem() / 1024 / 1024 / 1024;
            const freeMem = os.freemem() / 1024 / 1024 / 1024;
            const usedMem = totalMem - freeMem;
            
            const menuText = `╔〔 🧚‍♀️*${BOT_NAME}*💐〕╗
 *👋 Hello, ${BOT_NAME} User!*
╚══════════════════════╝

╭─「 *COMMAND PANEL* 」
│🔹 *Run*     : ${days}d ${hours}h ${minutes}m ${seconds}s
│🔹 *Mode*    : Public
│🔹 *Prefix*  : ${PREFIX}
│🔹 *Ram*     : ${usedMem.toFixed(2)} / ${totalMem.toFixed(2)} GB
│🔹 *Time*    : ${moment().format('hh:mm:ss A')}
│🔹 *User*    : ${sender.split("@")[0]}
╰─────────────●●►

*╭────❒ DOWNLOADER ❒*
*├◈ ${PREFIX}ytv <url>*
*├◈ ${PREFIX}yta <url>*
*├◈ ${PREFIX}fb <url>*
*├◈ ${PREFIX}ig <url>*
*├◈ ${PREFIX}tiktok <url>*
*├◈ ${PREFIX}twitter <url>*
*├◈ ${PREFIX}mediafire <url>*
*┕──────────────────❒*

*╭────❒ GENERAL ❒*
*├◈ ${PREFIX}menu*
*├◈ ${PREFIX}ping*
*├◈ ${PREFIX}uptime*
*├◈ ${PREFIX}owner*
*├◈ ${PREFIX}botinfo*
*┕──────────────────❒*

*╭────❒ GROUP ❒*
*├◈ ${PREFIX}tagall*
*├◈ ${PREFIX}admins*
*├◈ ${PREFIX}promote @user*
*├◈ ${PREFIX}demote @user*
*├◈ ${PREFIX}kick @user*
*├◈ ${PREFIX}add 91xxxxx*
*├◈ ${PREFIX}leave*
*├◈ ${PREFIX}groupinfo*
*┕──────────────────❒*

*╭────❒ MEDIA ❒*
*├◈ ${PREFIX}sticker*
*├◈ ${PREFIX}toimage*
*├◈ ${PREFIX}s*
*┕──────────────────❒*

*╭────❒ TOOLS ❒*
*├◈ ${PREFIX}qr <text>*
*├◈ ${PREFIX}ssweb <url>*
*├◈ ${PREFIX}shorturl <url>*
*├◈ ${PREFIX}calc <eq>*
*├◈ ${PREFIX}weather <city>*
*├◈ ${PREFIX}wiki <query>*
*├◈ ${PREFIX}translate <lang> <text>*
*┕──────────────────❒*

*╭────❒ REACTIONS ❒*
*├◈ ${PREFIX}hug @user*
*├◈ ${PREFIX}kiss @user*
*├◈ ${PREFIX}slap @user*
*├◈ ${PREFIX}pat @user*
*├◈ ${PREFIX}poke @user*
*├◈ ${PREFIX}dance*
*├◈ ${PREFIX}cry*
*┕──────────────────❒*

*╭────❒ OWNER ❒*
*├◈ ${PREFIX}block @user*
*├◈ ${PREFIX}unblock @user*
*├◈ ${PREFIX}bc <msg>*
*├◈ ${PREFIX}join <link>*
*├◈ ${PREFIX}leaveall*
*┕──────────────────❒*

*Made by YAMDHUD*`;
            await sock.sendMessage(chatId, { text: menuText });
        }
        
        else if (command === "ping") {
            const start = Date.now();
            await sock.sendMessage(chatId, { text: "🏓 Pinging..." });
            const end = Date.now();
            await sock.sendMessage(chatId, { text: `*Pong!* 🏓\nLatency: ${end - start}ms` });
        }
        
        else if (command === "uptime" || command === "runtime") {
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor(uptime / 3600) % 24;
            const minutes = Math.floor(uptime / 60) % 60;
            const seconds = Math.floor(uptime % 60);
            await sock.sendMessage(chatId, { text: `*Bot Uptime:*\n${days}d ${hours}h ${minutes}m ${seconds}s` });
        }
        
        else if (command === "owner" || command === "creator") {
            await sock.sendMessage(chatId, { text: `*Creator:* YAMDHUD\n*WhatsApp:* wa.me/${OWNER_NUMBER.split("@")[0]}\n*GitHub:* github.com/yamdhund` });
        }
        
        else if (command === "botinfo") {
            const totalMem = os.totalmem() / 1024 / 1024 / 1024;
            const freeMem = os.freemem() / 1024 / 1024 / 1024;
            const usedMem = totalMem - freeMem;
            await sock.sendMessage(chatId, { 
                text: `*🤖 Bot Information*\n\n*Name:* ${BOT_NAME}\n*Version:* 2.0.0\n*Owner:* YAMDHUD\n*Uptime:* ${moment.duration(process.uptime(), 'seconds').humanize()}\n*RAM:* ${usedMem.toFixed(2)}/${totalMem.toFixed(2)} GB\n*Platform:* ${os.platform()}\n*Node.js:* ${process.version}`
            });
        }
        
        // ========== DOWNLOADER COMMANDS ==========
        else if (command === "ytv" || command === "ytmp4") {
            if (!args[0]) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}ytv <youtube_url>` });
                return;
            }
            await sock.sendMessage(chatId, { text: "⏬ Downloading video, please wait..." });
            try {
                const info = await ytdl.getInfo(args[0]);
                const format = ytdl.chooseFormat(info.formats, { quality: '18' });
                await sock.sendMessage(chatId, { 
                    video: { url: format.url },
                    caption: `*Title:* ${info.videoDetails.title}\n*Duration:* ${info.videoDetails.lengthSeconds}s`
                });
            } catch (error) {
                await sock.sendMessage(chatId, { text: "❌ Failed to download video!" });
            }
        }
        
        else if (command === "yta" || command === "ytmp3") {
            if (!args[0]) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}yta <youtube_url>` });
                return;
            }
            await sock.sendMessage(chatId, { text: "⏬ Downloading audio, please wait..." });
            try {
                const info = await ytdl.getInfo(args[0]);
                const audioFormat = ytdl.chooseFormat(info.formats, { quality: '140' });
                await sock.sendMessage(chatId, { 
                    audio: { url: audioFormat.url },
                    mimetype: 'audio/mpeg',
                    fileName: `${info.videoDetails.title}.mp3`
                });
            } catch (error) {
                await sock.sendMessage(chatId, { text: "❌ Failed to download audio!" });
            }
        }
        
        else if (command === "fb" || command === "facebook") {
            if (!args[0]) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}fb <facebook_url>` });
                return;
            }
            await sock.sendMessage(chatId, { text: "⏬ Downloading Facebook video..." });
            try {
                const response = await axios.get(`https://api.siputzx.my.id/api/d/fb?url=${encodeURIComponent(args[0])}`);
                if (response.data.status && response.data.data.hd) {
                    await sock.sendMessage(chatId, { video: { url: response.data.data.hd }, caption: "Facebook video downloaded!" });
                } else {
                    await sock.sendMessage(chatId, { text: "❌ Failed to get video!" });
                }
            } catch (error) {
                await sock.sendMessage(chatId, { text: "❌ Error downloading Facebook video!" });
            }
        }
        
        else if (command === "ig" || command === "instagram") {
            if (!args[0]) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}ig <instagram_url>` });
                return;
            }
            await sock.sendMessage(chatId, { text: "⏬ Downloading Instagram content..." });
            try {
                const response = await axios.get(`https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(args[0])}`);
                if (response.data.status && response.data.data.length > 0) {
                    for (let media of response.data.data.slice(0, 3)) {
                        if (media.type === 'video') {
                            await sock.sendMessage(chatId, { video: { url: media.url } });
                        } else {
                            await sock.sendMessage(chatId, { image: { url: media.url } });
                        }
                        await delay(1000);
                    }
                } else {
                    await sock.sendMessage(chatId, { text: "❌ Failed to get media!" });
                }
            } catch (error) {
                await sock.sendMessage(chatId, { text: "❌ Error downloading Instagram content!" });
            }
        }
        
        else if (command === "tiktok") {
            if (!args[0]) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}tiktok <tiktok_url>` });
                return;
            }
            await sock.sendMessage(chatId, { text: "⏬ Downloading TikTok video..." });
            try {
                const response = await axios.get(`https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(args[0])}`);
                if (response.data.status && response.data.data.nowm) {
                    await sock.sendMessage(chatId, { video: { url: response.data.data.nowm }, caption: "TikTok video without watermark!" });
                } else {
                    await sock.sendMessage(chatId, { text: "❌ Failed to download TikTok video!" });
                }
            } catch (error) {
                await sock.sendMessage(chatId, { text: "❌ Error downloading TikTok video!" });
            }
        }
        
        else if (command === "twitter" || command === "tw") {
            if (!args[0]) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}twitter <tweet_url>` });
                return;
            }
            await sock.sendMessage(chatId, { text: "⏬ Downloading Twitter media..." });
            try {
                const response = await axios.get(`https://api.siputzx.my.id/api/d/twitter?url=${encodeURIComponent(args[0])}`);
                if (response.data.status && response.data.data.hd) {
                    await sock.sendMessage(chatId, { video: { url: response.data.data.hd }, caption: "Twitter video downloaded!" });
                } else {
                    await sock.sendMessage(chatId, { text: "❌ Failed to download Twitter media!" });
                }
            } catch (error) {
                await sock.sendMessage(chatId, { text: "❌ Error downloading Twitter media!" });
            }
        }
        
        else if (command === "mediafire") {
            if (!args[0]) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}mediafire <mediafire_url>` });
                return;
            }
            await sock.sendMessage(chatId, { text: "⏬ Getting Mediafire link..." });
            try {
                const response = await axios.get(`https://api.siputzx.my.id/api/d/mediafire?url=${encodeURIComponent(args[0])}`);
                if (response.data.status) {
                    await sock.sendMessage(chatId, { text: `*Title:* ${response.data.data.title}\n*Size:* ${response.data.data.size}\n*Link:* ${response.data.data.link}` });
                } else {
                    await sock.sendMessage(chatId, { text: "❌ Failed to get Mediafire link!" });
                }
            } catch (error) {
                await sock.sendMessage(chatId, { text: "❌ Error fetching Mediafire link!" });
            }
        }
        
        // ========== MEDIA COMMANDS ==========
        else if (command === "sticker" || command === "s") {
            if (msg.message.imageMessage || msg.message.videoMessage) {
                const mediaMessage = msg.message.imageMessage || msg.message.videoMessage;
                const stream = await downloadContentFromMessage(mediaMessage, msg.message.imageMessage ? 'image' : 'video');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                await sock.sendMessage(chatId, { sticker: buffer }, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, { text: `*Usage:* Reply to an image/video with ${PREFIX}sticker` });
            }
        }
        
        else if (command === "toimage") {
            if (msg.message.stickerMessage) {
                const stickerMsg = msg.message.stickerMessage;
                const stream = await downloadContentFromMessage(stickerMsg, 'sticker');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                await sock.sendMessage(chatId, { image: buffer }, { quoted: msg });
            } else {
                await sock.sendMessage(chatId, { text: `*Usage:* Reply to a sticker with ${PREFIX}toimage` });
            }
        }
        
        // ========== TOOLS COMMANDS ==========
        else if (command === "qr") {
            if (!args[0]) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}qr <text/link>` });
                return;
            }
            const qrText = args.join(" ");
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrText)}`;
            await sock.sendMessage(chatId, { image: { url: qrUrl }, caption: `QR Code for: ${qrText}` });
        }
        
        else if (command === "shorturl") {
            if (!args[0]) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}shorturl <url>` });
                return;
            }
            try {
                const shortResponse = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(args[0])}`);
                await sock.sendMessage(chatId, { text: `*Shortened URL:*\n${shortResponse.data}` });
            } catch (error) {
                await sock.sendMessage(chatId, { text: "❌ Failed to shorten URL!" });
            }
        }
        
        else if (command === "calc" || command === "calculate") {
            if (!args[0]) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}calc 2+2` });
                return;
            }
            try {
                const result = eval(args.join(" "));
                await sock.sendMessage(chatId, { text: `*Result:* ${result}` });
            } catch (error) {
                await sock.sendMessage(chatId, { text: "❌ Invalid calculation!" });
            }
        }
        
        else if (command === "weather") {
            if (!args[0]) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}weather <city_name>` });
                return;
            }
            try {
                const city = args.join(" ");
                const weatherRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=bd5e378503939ddaee76f12ad7a97608&units=metric`);
                const data = weatherRes.data;
                await sock.sendMessage(chatId, { 
                    text: `*Weather in ${data.name}*\n\n🌡️ Temperature: ${data.main.temp}°C\n💧 Humidity: ${data.main.humidity}%\n🌬️ Wind: ${data.wind.speed} m/s\n📝 Condition: ${data.weather[0].description}`
                });
            } catch (error) {
                await sock.sendMessage(chatId, { text: "❌ City not found!" });
            }
        }
        
        else if (command === "wiki") {
            if (!args[0]) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}wiki <query>` });
                return;
            }
            try {
                const wikiRes = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(args.join(" "))}`);
                await sock.sendMessage(chatId, { 
                    text: `*${wikiRes.data.title}*\n\n${wikiRes.data.extract.substring(0, 1000)}\n\nRead more: ${wikiRes.data.content_urls.desktop.page}`
                });
            } catch (error) {
                await sock.sendMessage(chatId, { text: "❌ No Wikipedia page found!" });
            }
        }
        
        else if (command === "translate") {
            if (args.length < 2) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}translate <language_code> <text>\nExample: ${PREFIX}translate hi Hello` });
                return;
            }
            const targetLang = args[0];
            const textToTranslate = args.slice(1).join(" ");
            try {
                const translateRes = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`);
                const translated = translateRes.data[0][0][0];
                await sock.sendMessage(chatId, { text: `*Translation (${targetLang}):*\n${translated}` });
            } catch (error) {
                await sock.sendMessage(chatId, { text: "❌ Translation failed!" });
            }
        }
        
        // ========== REACTION COMMANDS ==========
        else if (command === "hug") {
            const mentionedUser = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
            await sock.sendMessage(chatId, { text: `🤗 *@${sender.split("@")[0]}* hugged *@${mentionedUser.split("@")[0]}*!`, mentions: [sender, mentionedUser] });
        }
        
        else if (command === "kiss") {
            const mentionedUser = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
            await sock.sendMessage(chatId, { text: `😘 *@${sender.split("@")[0]}* kissed *@${mentionedUser.split("@")[0]}*! 💋`, mentions: [sender, mentionedUser] });
        }
        
        else if (command === "slap") {
            const mentionedUser = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
            await sock.sendMessage(chatId, { text: `👋 *@${sender.split("@")[0]}* slapped *@${mentionedUser.split("@")[0]}*! 💥`, mentions: [sender, mentionedUser] });
        }
        
        else if (command === "pat") {
            const mentionedUser = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
            await sock.sendMessage(chatId, { text: `🖐️ *@${sender.split("@")[0]}* patted *@${mentionedUser.split("@")[0]}*! 🥰`, mentions: [sender, mentionedUser] });
        }
        
        else if (command === "poke") {
            const mentionedUser = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
            await sock.sendMessage(chatId, { text: `👉 *@${sender.split("@")[0]}* poked *@${mentionedUser.split("@")[0]}*!`, mentions: [sender, mentionedUser] });
        }
        
        else if (command === "dance") {
            await sock.sendMessage(chatId, { text: `💃 *@${sender.split("@")[0]}* is dancing! 🕺`, mentions: [sender] });
        }
        
        else if (command === "cry") {
            await sock.sendMessage(chatId, { text: `😭 *@${sender.split("@")[0]}* is crying! 🥺`, mentions: [sender] });
        }
        
        // ========== GROUP COMMANDS ==========
        else if (command === "tagall" && isGroup) {
            const groupMetadata = await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants;
            let mentionText = "*📢 Attention everyone!*\n\n";
            let mentions = [];
            participants.forEach(p => {
                mentionText += `@${p.id.split("@")[0]}\n`;
                mentions.push(p.id);
            });
            await sock.sendMessage(chatId, { text: mentionText, mentions: mentions });
        }
        
        else if (command === "admins" && isGroup) {
            const groupMetadata = await sock.groupMetadata(chatId);
            const admins = groupMetadata.participants.filter(p => p.admin);
            let adminText = "*👑 Group Admins*\n\n";
            admins.forEach(admin => {
                adminText += `@${admin.id.split("@")[0]}\n`;
            });
            await sock.sendMessage(chatId, { text: adminText, mentions: admins.map(a => a.id) });
        }
        
        else if (command === "groupinfo" && isGroup) {
            const groupMetadata = await sock.groupMetadata(chatId);
            await sock.sendMessage(chatId, { 
                text: `*📊 Group Information*\n\n*Name:* ${groupMetadata.subject}\n*ID:* ${groupMetadata.id}\n*Owner:* @${groupMetadata.owner?.split("@")[0]}\n*Members:* ${groupMetadata.participants.length}\n*Created:* ${new Date(groupMetadata.creation * 1000).toLocaleDateString()}`,
                mentions: [groupMetadata.owner]
            });
        }
        
        else if (command === "promote" && isGroup && (isOwner || msg.key.participant)) {
            const promoteUser = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!promoteUser) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}promote @user` });
                return;
            }
            await sock.groupParticipantsUpdate(chatId, [promoteUser], "promote");
            await sock.sendMessage(chatId, { text: `✅ @${promoteUser.split("@")[0]} has been promoted to admin!`, mentions: [promoteUser] });
        }
        
        else if (command === "demote" && isGroup && (isOwner || msg.key.participant)) {
            const demoteUser = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!demoteUser) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}demote @user` });
                return;
            }
            await sock.groupParticipantsUpdate(chatId, [demoteUser], "demote");
            await sock.sendMessage(chatId, { text: `⬇️ @${demoteUser.split("@")[0]} has been demoted!`, mentions: [demoteUser] });
        }
        
        else if (command === "kick" && isGroup && (isOwner || msg.key.participant)) {
            const kickUser = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!kickUser) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}kick @user` });
                return;
            }
            await sock.groupParticipantsUpdate(chatId, [kickUser], "remove");
            await sock.sendMessage(chatId, { text: `👋 @${kickUser.split("@")[0]} has been removed!`, mentions: [kickUser] });
        }
        
        else if (command === "add" && isGroup && (isOwner || msg.key.participant)) {
            if (!args[0]) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}add 91xxxxxxxxxx` });
                return;
            }
            const numberToAdd = args[0].replace(/[^0-9]/g, '') + "@s.whatsapp.net";
            await sock.groupParticipantsUpdate(chatId, [numberToAdd], "add");
            await sock.sendMessage(chatId, { text: `✅ Added @${args[0]} to the group!`, mentions: [numberToAdd] });
        }
        
        else if (command === "leave" && isGroup) {
            await sock.sendMessage(chatId, { text: "👋 Bot is leaving this group. Goodbye!" });
            await delay(2000);
            await sock.groupLeave(chatId);
        }
        
        // ========== OWNER COMMANDS ==========
        else if (command === "block" && isOwner) {
            const blockUser = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!blockUser) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}block @user` });
                return;
            }
            await sock.updateBlockStatus(blockUser, "block");
            await sock.sendMessage(chatId, { text: `🚫 Blocked @${blockUser.split("@")[0]}`, mentions: [blockUser] });
        }
        
        else if (command === "unblock" && isOwner) {
            const unblockUser = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!unblockUser) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}unblock @user` });
                return;
            }
            await sock.updateBlockStatus(unblockUser, "unblock");
            await sock.sendMessage(chatId, { text: `✅ Unblocked @${unblockUser.split("@")[0]}`, mentions: [unblockUser] });
        }
        
        else if (command === "bc" || command === "broadcast") {
            if (!isOwner) {
                await sock.sendMessage(chatId, { text: "❌ Only owner can use this command!" });
                return;
            }
            if (!args[0]) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}bc <message>` });
                return;
            }
            const broadcastMsg = args.join(" ");
            const chats = await sock.groupFetchAllParticipating();
            let sentCount = 0;
            for (let groupId in chats) {
                await sock.sendMessage(groupId, { text: `📢 *Broadcast Message*\n\n${broadcastMsg}\n\n- ${BOT_NAME}` });
                sentCount++;
                await delay(1000);
            }
            await sock.sendMessage(chatId, { text: `✅ Broadcast sent to ${sentCount} groups!` });
        }
        
        else if (command === "join" && isOwner) {
            if (!args[0]) {
                await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}join <group_link>` });
                return;
            }
            const inviteCode = args[0].split("https://chat.whatsapp.com/")[1];
            await sock.groupAcceptInvite(inviteCode);
            await sock.sendMessage(chatId, { text: "✅ Bot joined the group!" });
        }
        
        else if (command === "leaveall" && isOwner) {
            const allGroups = await sock.groupFetchAllParticipating();
            for (let groupId in allGroups) {
                await sock.groupLeave(groupId);
                await delay(1000);
            }
            await sock.sendMessage(chatId, { text: "✅ Bot left all groups!" });
        }
        
        else if (command === "setpp") {
            await sock.sendMessage(chatId, { text: "⚠️ This command requires media. Send with an image!" });
        }
        
        else {
            // Unknown command - ignore
        }
        
    } catch (error) {
        console.error("Command error:", error);
        await sock.sendMessage(chatId, { text: "❌ An error occurred!" });
    }
}

// ============ MESSAGE HANDLER ============
async function setupMessageHandler(sock) {
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const messageText = msg.message.conversation || 
                           msg.message.extendedTextMessage?.text ||
                           msg.message.imageMessage?.caption ||
                           msg.message.videoMessage?.caption;
        
        if (!messageText) return;
        
        const sender = msg.key.remoteJid.endsWith("@g.us") ? msg.key.participant : msg.key.remoteJid;
        
        if (!messageText.startsWith(PREFIX)) return;
        
        const [cmd, ...args] = messageText.slice(PREFIX.length).trim().split(" ");
        const command = cmd.toLowerCase();
        
        await handleCommand(sock, msg, command, args, sender);
    });
}

// ============ PAIRING FUNCTION ============
async function startPairing(phoneNumber, res) {
    const sessionID = `session_${Date.now()}`;
    const sessionDir = path.join(__dirname, 'sessions', sessionID);
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
    });
    
    setupMessageHandler(sock);
    activeSockets.set(sessionID, sock);
    
    if (!sock.authState.creds.registered) {
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
        
        try {
            await delay(3000);
            const code = await sock.requestPairingCode(phoneNumber);
            res.json({ status: true, code: code });
        } catch (error) {
            console.error("Pairing Code Error:", error);
            res.json({ status: false, message: "Code generate nahi ho paya. Try again." });
        }
    }
    
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === "open") {
            console.log("✅ WhatsApp Connected!");
            await delay(5000);
            
            const credsPath = path.join(sessionDir, 'creds.json');
            
            if (fs.existsSync(credsPath)) {
                const userJid = `${phoneNumber}@s.whatsapp.net`;
                await sock.sendMessage(userJid, {
                    document: fs.readFileSync(credsPath),
                    fileName: "creds.json",
                    mimetype: "application/json",
                    caption: `✅ Aapki Creds.json File Taiyaar Hai!\n\nMade by YAMDHUD.\n\nBot Commands: ${PREFIX}menu`
                });
                
                console.log(`✅ File sent to ${phoneNumber}`);
                setTimeout(() => { 
                    fs.removeSync(sessionDir);
                    activeSockets.delete(sessionID);
                }, 10000);
            }
        }
        
        if (connection === "close") {
            let reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                console.log("Reconnecting...");
            }
        }
    });
    
    sock.ev.on("creds.update", saveCreds);
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
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #075e54 0%, #128C7E 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    padding: 40px;
                    max-width: 500px;
                    width: 100%;
                    text-align: center;
                }
                h1 { color: #075e54; margin-bottom: 10px; font-size: 1.8em; }
                .subtitle { color: #128C7E; margin-bottom: 30px; font-size: 0.9em; }
                input {
                    width: 100%;
                    padding: 15px;
                    font-size: 16px;
                    border: 2px solid #ddd;
                    border-radius: 10px;
                    margin-bottom: 15px;
                }
                input:focus { outline: none; border-color: #25d366; }
                button {
                    background: #25d366;
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    font-size: 16px;
                    border-radius: 10px;
                    cursor: pointer;
                    width: 100%;
                    font-weight: bold;
                }
                button:hover { background: #128C7E; transform: translateY(-2px); }
                .code-box {
                    margin-top: 30px;
                    padding: 20px;
                    background: #f0f2f5;
                    border-radius: 10px;
                    display: none;
                }
                .code {
                    font-size: 48px;
                    font-weight: bold;
                    color: #075e54;
                    letter-spacing: 5px;
                    margin: 20px 0;
                }
                .status {
                    margin-top: 20px;
                    padding: 10px;
                    border-radius: 10px;
                    font-size: 14px;
                }
                .success { background: #d4edda; color: #155724; }
                .error { background: #f8d7da; color: #721c24; }
                .info { background: #d1ecf1; color: #0c5460; }
                .footer { margin-top: 30px; font-size: 12px; color: #888; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 ${BOT_NAME}</h1>
                <div class="subtitle">WhatsApp Bot Panel</div>
                <input type="text" id="phone" placeholder="Enter WhatsApp Number (e.g., 918154980144)" />
                <button onclick="getCode()">🚀 Generate Pairing Code</button>
                <div id="codeBox" class="code-box">
                    <div>✨ Your Pairing Code:</div>
                    <div id="displayCode" class="code"></div>
                    <div>Open WhatsApp > Settings > Linked Devices > Link with phone number</div>
                </div>
                <div id="status" class="status" style="display: none;"></div>
                <div class="footer">Made with ❤️ by YAMDHUD<br>50+ Commands Available</div>
            </div>
            <script>
                async function getCode() {
                    const num = document.getElementById('phone').value;
                    if (!num) {
                        showStatus('Please enter your WhatsApp number!', 'error');
                        return;
                    }
                    document.getElementById('codeBox').style.display = 'none';
                    showStatus('Generating pairing code... Please wait.', 'info');
                    try {
                        const response = await fetch('/get-code?num=' + encodeURIComponent(num));
                        const data = await response.json();
                        if(data.status) {
                            document.getElementById('displayCode').innerText = data.code;
                            document.getElementById('codeBox').style.display = 'block';
                            showStatus('✅ Code generated! Enter this code in WhatsApp.', 'success');
                        } else {
                            showStatus('❌ Error: ' + data.message, 'error');
                        }
                    } catch (error) {
                        showStatus('❌ Network error! Please try again.', 'error');
                    }
                }
                function showStatus(message, type) {
                    const statusDiv = document.getElementById('status');
                    statusDiv.textContent = message;
                    statusDiv.className = 'status ' + type;
                    statusDiv.style.display = 'block';
                    setTimeout(() => { statusDiv.style.display = 'none'; }, 8000);
                }
            </script>
        </body>
        </html>
    `);
});

app.get("/get-code", async (req, res) => {
    const num = req.query.num;
    if (!num) return res.json({ status: false, message: "Number chahiye!" });
    await startPairing(num, res);
});

app.listen(port, () => {
    console.log(`🚀 ${BOT_NAME} Bot running at http://localhost:${port}`);
    console.log(`📱 Owner: ${OWNER_NUMBER}`);
    console.log(`🎯 Prefix: ${PREFIX}`);
    console.log(`✨ Total Commands: 50+`);
});

process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    for (let [id, sock] of activeSockets) {
        await sock.logout();
    }
    process.exit(0);
});
