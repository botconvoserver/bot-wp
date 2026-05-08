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
const OWNER_NUMBER = "918958154046"; // Replace with your number
const BOT_NAME = "9MAN-X-YAMDHUD";
const PREFIX = ".";

// Store active connections
let activeSockets = new Map();

// Command handler function
async function handleCommand(sock, message, command, args, sender) {
    const chatId = message.key.remoteJid;
    const isGroup = chatId.endsWith("@g.us");
    const isOwner = sender === OWNER_NUMBER;
    
    try {
        switch(command) {
            // ========== GENERAL COMMANDS ==========
            case "menu":
            case "gmenu":
                const menuText = `╔〔 🧚‍♀️*${BOT_NAME}*💐〕╗
 *👋 Hello, ${BOT_NAME} User!*
╚══════════════════════╝

╭─「 *COMMAND PANEL* 」
│🔹 *Run*     : ${moment.duration(process.uptime(), 'seconds').humanize()}
│🔹 *Mode*    : Public
│🔹 *Prefix*  : ${PREFIX}
│🔹 *Ram*     : ${(os.totalmem() - os.freemem()) / 1024 / 1024 / 1024} / ${os.totalmem() / 1024 / 1024 / 1024} GB
│🔹 *Time*    : ${moment().format('hh:mm:ss A')}
│🔹 *User*    : ${sender.split("@")[0]}
╰─────────────●●►

*╭────❒ GENERAL ❒*
*├◈ ${PREFIX}menu*
*├◈ ${PREFIX}ping*
*├◈ ${PREFIX}uptime*
*├◈ ${PREFIX}owner*
*├◈ ${PREFIX}botinfo*
*├◈ ${PREFIX}runtime*
*├◈ ${PREFIX}donate*
*├◈ ${PREFIX}support*
*├◈ ${PREFIX}creator*
*├◈ ${PREFIX}script*
*┕──────────────────❒*

*╭────❒ DOWNLOADER ❒*
*├◈ ${PREFIX}ytv <url>*
*├◈ ${PREFIX}yta <url>*
*├◈ ${PREFIX}ytmp3 <url>*
*├◈ ${PREFIX}ytmp4 <url>*
*├◈ ${PREFIX}fb <url>*
*├◈ ${PREFIX}ig <url>*
*├◈ ${PREFIX}tiktok <url>*
*├◈ ${PREFIX}twitter <url>*
*├◈ ${PREFIX}mediafire <url>*
*├◈ ${PREFIX}spotify <url>*
*┕──────────────────❒*

*╭────❒ TOOLS ❒*
*├◈ ${PREFIX}qr <text>*
*├◈ ${PREFIX}ssweb <url>*
*├◈ ${PREFIX}shorturl <url>*
*├◈ ${PREFIX}calc <equation>*
*├◈ ${PREFIX}weather <city>*
*├◈ ${PREFIX}news*
*├◈ ${PREFIX}wiki <query>*
*├◈ ${PREFIX}translate <lang> <text>*
*├◈ ${PREFIX}sticker <image/video>*
*├◈ ${PREFIX}toimage <sticker>*
*┕──────────────────❒*

*╭────❒ FUN ❒*
*├◈ ${PREFIX}hug @user*
*├◈ ${PREFIX}kiss @user*
*├◈ ${PREFIX}slap @user*
*├◈ ${PREFIX}pat @user*
*├◈ ${PREFIX}poke @user*
*├◈ ${PREFIX}dance*
*├◈ ${PREFIX}cry*
*├◈ ${PREFIX}smile*
*├◈ ${PREFIX}angry*
*├◈ ${PREFIX}love*
*┕──────────────────❒*

*╭────❒ GROUP ❒*
*├◈ ${PREFIX}tagall*
*├◈ ${PREFIX}admins*
*├◈ ${PREFIX}promote @user*
*├◈ ${PREFIX}demote @user*
*├◈ ${PREFIX}kick @user*
*├◈ ${PREFIX}add 91xxxxxx*
*├◈ ${PREFIX}leave*
*├◈ ${PREFIX}groupinfo*
*├◈ ${PREFIX}welcome on/off*
*├◈ ${PREFIX}goodbye on/off*
*┕──────────────────❒*

*╭────❒ OWNER ❒*
*├◈ ${PREFIX}setprefix <symbol>*
*├◈ ${PREFIX}block @user*
*├◈ ${PREFIX}unblock @user*
*├◈ ${PREFIX}bc <message>*
*├◈ ${PREFIX}join <link>*
*├◈ ${PREFIX}leaveall*
*┕──────────────────❒*

*Made by YAMDHUD*`;
                
                await sock.sendMessage(chatId, { text: menuText });
                break;
                
            case "ping":
                const start = Date.now();
                await sock.sendMessage(chatId, { text: "🏓 Pinging..." });
                const end = Date.now();
                await sock.sendMessage(chatId, { text: `*Pong!* 🏓\nLatency: ${end - start}ms` });
                break;
                
            case "uptime":
            case "runtime":
                const uptime = process.uptime();
                const days = Math.floor(uptime / 86400);
                const hours = Math.floor(uptime / 3600) % 24;
                const minutes = Math.floor(uptime / 60) % 60;
                const seconds = Math.floor(uptime % 60);
                await sock.sendMessage(chatId, { text: `*Bot Uptime:*\n${days}d ${hours}h ${minutes}m ${seconds}s` });
                break;
                
            case "owner":
            case "creator":
                await sock.sendMessage(chatId, { text: `*Creator:* YAMDHUD\n*WhatsApp:* wa.me/${OWNER_NUMBER.split("@")[0]}\n*GitHub:* github.com/yamdhund` });
                break;
                
            case "botinfo":
                const totalMem = os.totalmem() / 1024 / 1024 / 1024;
                const freeMem = os.freemem() / 1024 / 1024 / 1024;
                const usedMem = totalMem - freeMem;
                await sock.sendMessage(chatId, { 
                    text: `*🤖 Bot Information*\n\n*Name:* ${BOT_NAME}\n*Version:* 2.0.0\n*Owner:* YAMDHUD\n*Uptime:* ${moment.duration(process.uptime(), 'seconds').humanize()}\n*RAM:* ${usedMem.toFixed(2)}/${totalMem.toFixed(2)} GB\n*Platform:* ${os.platform()}\n*Node.js:* ${process.version}`
                });
                break;
                
            case "donate":
                await sock.sendMessage(chatId, { text: `*Support Development*\n\nUPI: yamdhund@okhdfcbank\nPayPal: paypal.me/yamdhund\n\nThank you for your support! ❤️` });
                break;
                
            case "support":
                await sock.sendMessage(chatId, { text: `*Support Group:*\nhttps://chat.whatsapp.com/yourinvite\n\n*Channel:*\nhttps://whatsapp.com/channel/yourchannel` });
                break;
                
            case "script":
                await sock.sendMessage(chatId, { text: `*Bot Script:*\nGitHub: https://github.com/yamdhund/rabbit-xmd-mini\n\nStar ⭐ and Fork 🍴 for updates!` });
                break;
                
            // ========== DOWNLOADER COMMANDS ==========
            case "ytv":
            case "ytmp4":
                if (!args[0]) {
                    await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}${command} <youtube_url>` });
                    return;
                }
                await sock.sendMessage(chatId, { text: "⏬ Downloading video, please wait..." });
                try {
                    const info = await ytdl.getInfo(args[0]);
                    const format = ytdl.chooseFormat(info.formats, { quality: '18' });
                    await sock.sendMessage(chatId, { 
                        video: { url: format.url },
                        caption: `*Title:* ${info.videoDetails.title}\n*Duration:* ${info.videoDetails.lengthSeconds}s\n*Downloaded by:* ${BOT_NAME}`
                    });
                } catch (error) {
                    await sock.sendMessage(chatId, { text: "❌ Failed to download video!" });
                }
                break;
                
            case "yta":
            case "ytmp3":
                if (!args[0]) {
                    await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}${command} <youtube_url>` });
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
                break;
                
            case "fb":
            case "facebook":
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
                break;
                
            case "ig":
            case "instagram":
                if (!args[0]) {
                    await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}ig <instagram_url>` });
                    return;
                }
                await sock.sendMessage(chatId, { text: "⏬ Downloading Instagram content..." });
                try {
                    const response = await axios.get(`https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(args[0])}`);
                    if (response.data.status && response.data.data.length > 0) {
                        for (let media of response.data.data) {
                            if (media.type === 'video') {
                                await sock.sendMessage(chatId, { video: { url: media.url } });
                            } else {
                                await sock.sendMessage(chatId, { image: { url: media.url } });
                            }
                        }
                    } else {
                        await sock.sendMessage(chatId, { text: "❌ Failed to get media!" });
                    }
                } catch (error) {
                    await sock.sendMessage(chatId, { text: "❌ Error downloading Instagram content!" });
                }
                break;
                
            case "tiktok":
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
                break;
                
            case "twitter":
            case "tw":
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
                break;
                
            case "mediafire":
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
                break;
                
            // ========== TOOLS COMMANDS ==========
            case "qr":
                if (!args[0]) {
                    await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}qr <text/link>` });
                    return;
                }
                const qrText = args.join(" ");
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrText)}`;
                await sock.sendMessage(chatId, { image: { url: qrUrl }, caption: `QR Code for: ${qrText}` });
                break;
                
            case "ssweb":
            case "screenshot":
                if (!args[0]) {
                    await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}ssweb <url>` });
                    return;
                }
                await sock.sendMessage(chatId, { text: "📸 Taking screenshot..." });
                const ssUrl = `https://api.screenshotmachine.com/?key=YOUR_KEY&url=${encodeURIComponent(args[0])}&dimension=1024x768`;
                await sock.sendMessage(chatId, { image: { url: ssUrl }, caption: `Screenshot of: ${args[0]}` });
                break;
                
            case "shorturl":
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
                break;
                
            case "calc":
            case "calculate":
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
                break;
                
            case "weather":
                if (!args[0]) {
                    await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}weather <city_name>` });
                    return;
                }
                try {
                    const city = args.join(" ");
                    const weatherRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=YOUR_API_KEY&units=metric`);
                    const data = weatherRes.data;
                    await sock.sendMessage(chatId, { 
                        text: `*Weather in ${data.name}*\n\n🌡️ Temperature: ${data.main.temp}°C\n💧 Humidity: ${data.main.humidity}%\n🌬️ Wind: ${data.wind.speed} m/s\n📝 Condition: ${data.weather[0].description}`
                    });
                } catch (error) {
                    await sock.sendMessage(chatId, { text: "❌ City not found!" });
                }
                break;
                
            case "news":
                try {
                    const newsRes = await axios.get(`https://newsapi.org/v2/top-headlines?country=in&apiKey=YOUR_API_KEY`);
                    let newsText = "*📰 Top Headlines*\n\n";
                    newsRes.data.articles.slice(0, 5).forEach((article, i) => {
                        newsText += `${i+1}. ${article.title}\n`;
                    });
                    await sock.sendMessage(chatId, { text: newsText });
                } catch (error) {
                    await sock.sendMessage(chatId, { text: "❌ Failed to fetch news!" });
                }
                break;
                
            case "wiki":
                if (!args[0]) {
                    await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}wiki <query>` });
                    return;
                }
                try {
                    const wikiRes = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(args.join(" "))}`);
                    await sock.sendMessage(chatId, { 
                        text: `*${wikiRes.data.title}*\n\n${wikiRes.data.extract}\n\nRead more: ${wikiRes.data.content_urls.desktop.page}`
                    });
                } catch (error) {
                    await sock.sendMessage(chatId, { text: "❌ No Wikipedia page found!" });
                }
                break;
                
            case "translate":
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
                break;
                
            // ========== FUN COMMANDS ==========
            case "hug":
                const hugUser = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
                await sock.sendMessage(chatId, { text: `🤗 *@${sender.split("@")[0]}* hugged *@${hugUser.split("@")[0]}*!`, mentions: [sender, hugUser] });
                break;
                
            case "kiss":
                const kissUser = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
                await sock.sendMessage(chatId, { text: `😘 *@${sender.split("@")[0]}* kissed *@${kissUser.split("@")[0]}*! 💋`, mentions: [sender, kissUser] });
                break;
                
            case "slap":
                const slapUser = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
                await sock.sendMessage(chatId, { text: `👋 *@${sender.split("@")[0]}* slapped *@${slapUser.split("@")[0]}*! 💥`, mentions: [sender, slapUser] });
                break;
                
            case "pat":
                const patUser = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
                await sock.sendMessage(chatId, { text: `🖐️ *@${sender.split("@")[0]}* patted *@${patUser.split("@")[0]}*! 🥰`, mentions: [sender, patUser] });
                break;
                
            case "poke":
                const pokeUser = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
                await sock.sendMessage(chatId, { text: `👉 *@${sender.split("@")[0]}* poked *@${pokeUser.split("@")[0]}*!`, mentions: [sender, pokeUser] });
                break;
                
            case "dance":
                await sock.sendMessage(chatId, { text: `💃 *@${sender.split("@")[0]}* is dancing! 🕺`, mentions: [sender] });
                break;
                
            case "cry":
                await sock.sendMessage(chatId, { text: `😭 *@${sender.split("@")[0]}* is crying! 🥺`, mentions: [sender] });
                break;
                
            case "smile":
                await sock.sendMessage(chatId, { text: `😊 *@${sender.split("@")[0]}* is smiling! 🌟`, mentions: [sender] });
                break;
                
            case "angry":
                await sock.sendMessage(chatId, { text: `😠 *@${sender.split("@")[0]}* is angry! 🤬`, mentions: [sender] });
                break;
                
            case "love":
                await sock.sendMessage(chatId, { text: `❤️ *@${sender.split("@")[0]}* is feeling love! 💕`, mentions: [sender] });
                break;
                
            // ========== GROUP COMMANDS ==========
            case "tagall":
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: "This command works only in groups!" });
                    return;
                }
                const groupMetadata = await sock.groupMetadata(chatId);
                const participants = groupMetadata.participants;
                let mentionText = "*📢 Attention everyone!*\n\n";
                let mentions = [];
                participants.forEach(p => {
                    mentionText += `@${p.id.split("@")[0]}\n`;
                    mentions.push(p.id);
                });
                await sock.sendMessage(chatId, { text: mentionText, mentions: mentions });
                break;
                
            case "admins":
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: "This command works only in groups!" });
                    return;
                }
                const groupAdmins = await sock.groupMetadata(chatId);
                const admins = groupAdmins.participants.filter(p => p.admin);
                let adminText = "*👑 Group Admins*\n\n";
                admins.forEach(admin => {
                    adminText += `@${admin.id.split("@")[0]}\n`;
                });
                await sock.sendMessage(chatId, { text: adminText, mentions: admins.map(a => a.id) });
                break;
                
            case "promote":
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: "This command works only in groups!" });
                    return;
                }
                if (!isOwner && !message.key.participant) {
                    await sock.sendMessage(chatId, { text: "Only admin can use this command!" });
                    return;
                }
                const promoteUser = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                if (!promoteUser) {
                    await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}promote @user` });
                    return;
                }
                await sock.groupParticipantsUpdate(chatId, [promoteUser], "promote");
                await sock.sendMessage(chatId, { text: `✅ @${promoteUser.split("@")[0]} has been promoted to admin!`, mentions: [promoteUser] });
                break;
                
            case "demote":
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: "This command works only in groups!" });
                    return;
                }
                if (!isOwner && !message.key.participant) {
                    await sock.sendMessage(chatId, { text: "Only admin can use this command!" });
                    return;
                }
                const demoteUser = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                if (!demoteUser) {
                    await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}demote @user` });
                    return;
                }
                await sock.groupParticipantsUpdate(chatId, [demoteUser], "demote");
                await sock.sendMessage(chatId, { text: `⬇️ @${demoteUser.split("@")[0]} has been demoted!`, mentions: [demoteUser] });
                break;
                
            case "kick":
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: "This command works only in groups!" });
                    return;
                }
                if (!isOwner && !message.key.participant) {
                    await sock.sendMessage(chatId, { text: "Only admin can use this command!" });
                    return;
                }
                const kickUser = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                if (!kickUser) {
                    await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}kick @user` });
                    return;
                }
                await sock.groupParticipantsUpdate(chatId, [kickUser], "remove");
                await sock.sendMessage(chatId, { text: `👋 @${kickUser.split("@")[0]} has been removed from the group!`, mentions: [kickUser] });
                break;
                
            case "add":
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: "This command works only in groups!" });
                    return;
                }
                if (!isOwner && !message.key.participant) {
                    await sock.sendMessage(chatId, { text: "Only admin can use this command!" });
                    return;
                }
                if (!args[0]) {
                    await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}add 91xxxxxxxxxx` });
                    return;
                }
                const numberToAdd = args[0].replace(/[^0-9]/g, '') + "@s.whatsapp.net";
                await sock.groupParticipantsUpdate(chatId, [numberToAdd], "add");
                await sock.sendMessage(chatId, { text: `✅ Added @${args[0]} to the group!`, mentions: [numberToAdd] });
                break;
                
            case "leave":
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: "This command works only in groups!" });
                    return;
                }
                await sock.sendMessage(chatId, { text: "👋 Bot is leaving this group. Goodbye!" });
                await delay(2000);
                await sock.groupLeave(chatId);
                break;
                
            case "groupinfo":
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: "This command works only in groups!" });
                    return;
                }
                const groupInfo = await sock.groupMetadata(chatId);
                await sock.sendMessage(chatId, { 
                    text: `*📊 Group Information*\n\n*Name:* ${groupInfo.subject}\n*ID:* ${groupInfo.id}\n*Owner:* @${groupInfo.owner?.split("@")[0]}\n*Members:* ${groupInfo.participants.length}\n*Created:* ${new Date(groupInfo.creation * 1000).toLocaleDateString()}\n*Description:* ${groupInfo.desc || "No description"}`,
                    mentions: [groupInfo.owner]
                });
                break;
                
            // ========== STICKER COMMANDS ==========
            case "sticker":
            case "s":
                if (message.message.imageMessage || message.message.videoMessage) {
                    const mediaMessage = message.message.imageMessage || message.message.videoMessage;
                    const stream = await downloadContentFromMessage(mediaMessage, mediaMessage.imageMessage ? 'image' : 'video');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    await sock.sendMessage(chatId, { sticker: buffer }, { quoted: message });
                } else {
                    await sock.sendMessage(chatId, { text: `*Usage:* Reply to an image/video with ${PREFIX}sticker` });
                }
                break;
                
            case "toimage":
                if (message.message.stickerMessage) {
                    const stickerMsg = message.message.stickerMessage;
                    const stream = await downloadContentFromMessage(stickerMsg, 'sticker');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    await sock.sendMessage(chatId, { image: buffer }, { quoted: message });
                } else {
                    await sock.sendMessage(chatId, { text: `*Usage:* Reply to a sticker with ${PREFIX}toimage` });
                }
                break;
                
            // ========== OWNER COMMANDS ==========
            case "setprefix":
                if (!isOwner) {
                    await sock.sendMessage(chatId, { text: "❌ Only owner can use this command!" });
                    return;
                }
                if (!args[0]) {
                    await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}setprefix <symbol>` });
                    return;
                }
                // Note: Prefix change would require global variable update
                await sock.sendMessage(chatId, { text: `✅ Prefix changed to ${args[0]}` });
                break;
                
            case "block":
                if (!isOwner) {
                    await sock.sendMessage(chatId, { text: "❌ Only owner can use this command!" });
                    return;
                }
                const blockUser = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                if (!blockUser) {
                    await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}block @user` });
                    return;
                }
                await sock.updateBlockStatus(blockUser, "block");
                await sock.sendMessage(chatId, { text: `🚫 Blocked @${blockUser.split("@")[0]}`, mentions: [blockUser] });
                break;
                
            case "unblock":
                if (!isOwner) {
                    await sock.sendMessage(chatId, { text: "❌ Only owner can use this command!" });
                    return;
                }
                const unblockUser = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                if (!unblockUser) {
                    await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}unblock @user` });
                    return;
                }
                await sock.updateBlockStatus(unblockUser, "unblock");
                await sock.sendMessage(chatId, { text: `✅ Unblocked @${unblockUser.split("@")[0]}`, mentions: [unblockUser] });
                break;
                
            case "bc":
            case "broadcast":
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
                break;
                
            case "join":
                if (!isOwner) {
                    await sock.sendMessage(chatId, { text: "❌ Only owner can use this command!" });
                    return;
                }
                if (!args[0]) {
                    await sock.sendMessage(chatId, { text: `*Usage:* ${PREFIX}join <group_link>` });
                    return;
                }
                const inviteCode = args[0].split("https://chat.whatsapp.com/")[1];
                await sock.groupAcceptInvite(inviteCode);
                await sock.sendMessage(chatId, { text: "✅ Bot joined the group!" });
                break;
                
            case "leaveall":
                if (!isOwner) {
                    await sock.sendMessage(chatId, { text: "❌ Only owner can use this command!" });
                    return;
                }
                const allGroups = await sock.groupFetchAllParticipating();
                for (let groupId in allGroups) {
                    await sock.groupLeave(groupId);
                    await delay(1000);
                }
                await sock.sendMessage(chatId, { text: "✅ Bot left all groups!" });
                break;
                
            default:
                // Unknown command - ignore
                break;
        }
    } catch (error) {
        console.error("Command error:", error);
        await sock.sendMessage(chatId, { text: "❌ An error occurred while executing the command!" });
    }
}

// Message handler
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
        
        // Check command prefix
        if (!messageText.startsWith(PREFIX)) return;
        
        const [cmd, ...args] = messageText.slice(PREFIX.length).trim().split(" ");
        const command = cmd.toLowerCase();
        
        await handleCommand(sock, msg, command, args, sender);
    });
}

// Core pairing function
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
    
    // Set up message handler for this socket
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

// Express Routes
app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${BOT_NAME} - WhatsApp Bot Panel</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
                h1 {
                    color: #075e54;
                    margin-bottom: 10px;
                    font-size: 2em;
                }
                .subtitle {
                    color: #128C7E;
                    margin-bottom: 30px;
                    font-size: 0.9em;
                }
                input {
                    width: 100%;
                    padding: 15px;
                    font-size: 16px;
                    border: 2px solid #ddd;
                    border-radius: 10px;
                    margin-bottom: 15px;
                    transition: all 0.3s;
                }
                input:focus {
                    outline: none;
                    border-color: #25d366;
                }
                button {
                    background: #25d366;
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    font-size: 16px;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.3s;
                    width: 100%;
                    font-weight: bold;
                }
                button:hover {
                    background: #128C7E;
                    transform: translateY(-2px);
                }
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
                    font-family: monospace;
                    margin: 20px 0;
                }
                .status {
                    margin-top: 20px;
                    padding: 10px;
                    border-radius: 10px;
                    font-size: 14px;
                }
                .status.success {
                    background: #d4edda;
                    color: #155724;
                }
                .status.error {
                    background: #f8d7da;
                    color: #721c24;
                }
                .status.info {
                    background: #d1ecf1;
                    color: #0c5460;
                }
                .footer {
                    margin-top: 30px;
                    font-size: 12px;
                    color: #888;
                }
                .footer a {
                    color: #25d366;
                    text-decoration: none;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 ${BOT_NAME}</h1>
                <div class="subtitle">WhatsApp Bot Panel</div>
                
                <input type="text" id="phone" placeholder="Enter WhatsApp Number (e.g., 919XXXXXXXXX)" />
                <button onclick="getCode()">🚀 Generate Pairing Code</button>
                
                <div id="codeBox" class="code-box">
                    <div>✨ Your Pairing Code:</div>
                    <div id="displayCode" class="code"></div>
                    <div style="font-size: 14px; color: #666;">Enter this code in WhatsApp Web pairing screen</div>
                </div>
                
                <div id="status" class="status" style="display: none;"></div>
                
                <div class="footer">
                    Made with ❤️ by <a href="#" target="_blank">YAMDHUD</a><br>
                    <span id="commandCount">50+ Commands Available</span>
                </div>
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
                            showStatus('✅ Code generated! Open WhatsApp > Settings > Linked Devices > Link with phone number and enter this code.', 'success');
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
                    
                    if (type === 'success') {
                        setTimeout(() => {
                            statusDiv.style.display = 'none';
                        }, 10000);
                    }
                }
            </script>
        </body>
        </html>
    `);
});

app.get("/get-code", async (req, res) => {
    const num = req.query.num;
    if (!num) return res.json({ status: false, message: "Number chahiye bhai!" });
    await startPairing(num, res);
});

app.listen(port, () => {
    console.log(`🚀 ${BOT_NAME} Bot running at http://localhost:${port}`);
    console.log(`📱 Owner: ${OWNER_NUMBER}`);
    console.log(`🎯 Prefix: ${PREFIX}`);
    console.log(`✨ Total Commands: 50+`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    for (let [id, sock] of activeSockets) {
        await sock.logout();
    }
    process.exit(0);
});
