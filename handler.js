import { smsg } from "./lib/simple.js"
import { format } from "util"
import { fileURLToPath } from "url"
import path, { join } from "path"
import fs, { unwatchFile, watchFile } from "fs"
import chalk from "chalk"
import fetch from "node-fetch"
import ws from "ws"

/**
 * @type {import('@whiskeysockets/baileys')}
 */
const { proto } = (await import("@whiskeysockets/baileys")).default
const isNumber = x => typeof x === "number" && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(() => { clearTimeout(this); resolve() }, ms))

export async function handler(chatUpdate) {
    this.msgqueque = this.msgqueque || []
    this.uptime = this.uptime || Date.now()
    if (!chatUpdate) return

    this.pushMessage(chatUpdate.messages).catch(console.error)
    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m) return

    if (global.db.data == null) await global.loadDatabase()

    try {
        m = smsg(this, m) || m
        if (!m) return
        m.exp = 0

        const botJid = this.user.jid
        ensureDatabaseSchema(m, botJid)

        const user = global.db.data.users[m.sender]
        const chat = global.db.data.chats[m.chat]
        const settings = global.db.data.settings[botJid]

        m.text = (
            (m.text || (m.msg && m.msg.caption) || (m.msg && m.msg.text) || (m.msg && m.msg.contentText) || (m.msg && m.msg.selectedDisplayText) || "")
        ).trim()

        updateUserName(this, m, user)

        const { isROwner, isOwner, isPrems, isOwners } = getPermissions(this, m, user)

        if (shouldIgnoreMessage(this, m, settings, isOwners)) return

        if (opts["queque"] && m.text && !isPrems) {
            handleMessageQueue.call(this, m)
        }

        if (m.isBaileys) return
        m.exp += Math.ceil(Math.random() * 10)

        const groupData = await getGroupMetadata(this, m)
        const { participants, groupMetadata, userGroup, botGroup, isRAdmin, isAdmin, isBotAdmin } = groupData

        const extraContext = {
            conn: this, match: null, usedPrefix: null, noPrefix: null, _args: [], args: [], 
            command: null, text: null, participants, groupMetadata, userGroup, botGroup,
            isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems,
            chatUpdate, __dirname: path.join(path.dirname(fileURLToPath(import.meta.url)), "./plugins"),
            user, chat, settings
        }

        for (const name in global.plugins) {
            const plugin = global.plugins[name]
            if (!plugin || plugin.disabled) continue
            
            const __filename = join(extraContext.__dirname, name)

            if (typeof plugin.all === "function") {
                try { await plugin.all.call(this, m, { ...extraContext, __filename }) } catch (e) { console.error(e) }
            }

            if (!opts["restrict"] && plugin.tags?.includes("admin")) continue

            const strRegex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")
            const pluginPrefix = plugin.customPrefix || this.prefix || global.prefix
            const match = findPrefixMatch(m.text, pluginPrefix, strRegex)

            if (typeof plugin.before === "function") {
                if (await plugin.before.call(this, m, { ...extraContext, match, __filename })) continue
            }

            if (typeof plugin !== "function") continue

            if (match) {
                const [usedPrefix] = match[0] || [""]
                const noPrefix = m.text.replace(usedPrefix, "")
                let [command, ...args] = noPrefix.trim().split(" ").filter(v => v)
                command = (command || "").toLowerCase()

                const isAccept = checkCommand(plugin, command)
                if (!isAccept) continue

                if (isMultiBotConflict.call(this, m, chat)) continue

                m.plugin = name
                global.comando = command
                user.commands++

                if (isRestricted(m, user, chat, isROwner, botJid, usedPrefix, name)) return

                if (chat.modoadmin && m.isGroup && !isAdmin && !isOwner) {
                    const wa = plugin.botAdmin || plugin.admin || plugin.group
                    if (wa) return
                }

                if (!hasCommandPermissions(plugin, { isROwner, isOwner, isPrems, isBotAdmin, isAdmin, m })) {
                    const failType = getFailType(plugin, { isROwner, isOwner, isPrems, isBotAdmin, isAdmin, m })
                    if (failType) {
                        (plugin.fail || global.dfail)(failType, m, this)
                        continue
                    }
                }

                m.isCommand = true
                const xp = plugin.exp ? parseInt(plugin.exp) : 10
                m.exp += xp

                const pluginArgs = { ...extraContext, match, usedPrefix, noPrefix, args, command, text: args.join(" "), _args: args, __filename }

                try {
                    await plugin.call(this, m, pluginArgs)
                } catch (err) {
                    m.error = err
                    console.error(err)
                } finally {
                    if (typeof plugin.after === "function") {
                        try { await plugin.after.call(this, m, pluginArgs) } catch (e) { console.error(e) }
                    }
                }
                break //  Command executed, exit loop 
            }
        }
    } catch (err) {
        console.error(err)
    } finally {
        finalizeHandler.call(this, m)
    }
}


function ensureDatabaseSchema(m, botJid) {

    if (typeof global.db.data.users[m.sender] !== "object") global.db.data.users[m.sender] = {}
    const user = global.db.data.users[m.sender]
    const userDefault = {
        name: m.name, exp: 0, cebollines: 0, bank: 0, level: 0, health: 100, genre: "", 
        birth: "", marry: "", description: "", packstickers: null, premium: false, 
        premiumTime: 0, banned: false, bannedReason: "", commands: 0, afk: -1, afkReason: "", warn: 0
    }
    for (let key in userDefault) if (!(key in user)) user[key] = userDefault[key]

    if (typeof global.db.data.chats[m.chat] !== "object") global.db.data.chats[m.chat] = {}
    const chat = global.db.data.chats[m.chat]
    const chatDefault = {
        isBanned: false, isMute: false, welcome: true, sWelcome: "", sBye: "", detect: true, 
        primaryBot: null, modoadmin: false, antiLink: true, antiLink2: false, antiBot: false, 
        antiBot2: false, nsfw: false, economy: true, gacha: true, audios: true, autoAceptar: false, 
        autoRechazar: false, autoresponder: false, reaction: true, antifake: false, 
        antiarabes: false, antitoxic: false, antiMencion: false, antiMencionAction: "kick", 
        autolevelup: false, antispam: false
    }
    for (let key in chatDefault) if (!(key in chat)) chat[key] = chatDefault[key]

    if (typeof global.db.data.settings[botJid] !== "object") global.db.data.settings[botJid] = {}
    const settings = global.db.data.settings[botJid]
    if (!("self" in settings)) settings.self = false
    if (!("jadibotmd" in settings)) settings.jadibotmd = true
}

function getPermissions(conn, m, user) {
    const owners = global.owner.map(n => Array.isArray(n) ? n[0] : n)
        .filter(v => typeof v === "string")
        .map(v => v.replace(/[^0-9]/g, ""))

    const isROwner = owners.flatMap(v => [`${v}@s.whatsapp.net`, `${v}@lid`]).includes(m.sender)
    const isOwner = isROwner || m.fromMe
    const isPrems = isROwner || user.premium || global.prems.some(v => v.replace(/[^0-9]/g, "") + "@s.whatsapp.net" === m.sender)
    const isOwners = [conn.user.jid, ...owners.map(v => `${v}@s.whatsapp.net`)].includes(m.sender)

    return { isROwner, isOwner, isPrems, isOwners }
}

async function getGroupMetadata(conn, m) {
    if (!m.isGroup) return { participants: [], groupMetadata: {}, userGroup: {}, botGroup: {}, isRAdmin: false, isAdmin: false, isBotAdmin: false }
    
    const chatData = conn.chats[m.chat] || {}
    const metadata = chatData.metadata || await conn.groupMetadata(m.chat).catch(() => ({}))
    const participants = (metadata.participants || []).map(p => ({ ...p, id: p.jid, jid: p.jid, lid: p.lid }))
    
    const userGroup = participants.find(p => conn.decodeJid(p.jid) === m.sender) || {}
    const botGroup = participants.find(p => conn.decodeJid(p.jid) === conn.user.jid) || {}
    
    return {
        participants,
        groupMetadata: metadata,
        userGroup,
        botGroup,
        isRAdmin: userGroup.admin === "superadmin",
        isAdmin: userGroup.admin === "admin" || userGroup.admin === "superadmin",
        isBotAdmin: !!botGroup.admin
    }
}

function findPrefixMatch(text, prefix, strRegex) {
    const prefixes = Array.isArray(prefix) ? prefix : [prefix]
    for (let p of prefixes) {
        const regex = p instanceof RegExp ? p : new RegExp(strRegex(p))
        const match = regex.exec(text)
        if (match) return [match, regex]
    }
    return null
}

function checkCommand(plugin, command) {
    if (plugin.command instanceof RegExp) return plugin.command.test(command)
    if (Array.isArray(plugin.command)) return plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command)
    return plugin.command === command
}

function isRestricted(m, user, chat, isROwner, botId, usedPrefix, pluginName) {
    if (isROwner) return false
    
    // Chat baneado
    if (pluginName !== "group-banchat.js" && chat.isBanned) {
        if (!chat.primaryBot || chat.primaryBot === botId) {
            m.reply(`💙 El bot está desactivado en este grupo.\nUsa *${usedPrefix}bot on* para activar.`)
            return true
        }
    }
    
    // Usuario baneado
    if (user.banned) {
        m.reply(`🖤 Estás baneado.\n*Razón:* ${user.bannedReason}`)
        return true
    }
    return false
}

function hasCommandPermissions(plugin, { isROwner, isOwner, isPrems, isBotAdmin, isAdmin, m }) {
    if (plugin.rowner && !isROwner) return false
    if (plugin.owner && !isOwner) return false
    if (plugin.premium && !isPrems) return false
    if (plugin.group && !m.isGroup) return false
    if (plugin.botAdmin && !isBotAdmin) return false
    if (plugin.admin && !isAdmin) return false
    return true
}

function getFailType(plugin, { isROwner, isOwner, isPrems, isBotAdmin, isAdmin, m }) {
    if (plugin.rowner && !isROwner) return "rowner"
    if (plugin.owner && !isOwner) return "owner"
    if (plugin.premium && !isPrems) return "premium"
    if (plugin.group && !m.isGroup) return "group"
    if (plugin.botAdmin && !isBotAdmin) return "botAdmin"
    if (plugin.admin && !isAdmin) return "admin"
    return null
}

function shouldIgnoreMessage(conn, m, settings, isOwners) {
    if (m.isBaileys) return true
    if (settings.self && !isOwners) return true
    // Ignorar IDs de bots conocidos
    if (m.id.startsWith("NJX-") || (m.id.startsWith("BAE5") && m.id.length === 16) || (m.id.startsWith("B24E") && m.id.length === 20)) return true
    return false
}

function isMultiBotConflict(m, chat) {
    if (!chat.primaryBot || chat.primaryBot === this.user.jid) return false
    
    const primaryBotConn = global.conns?.find(c => c.user.jid === chat.primaryBot && c.ws?.socket?.readyState !== ws.CLOSED)
    if (primaryBotConn) return true 
    
    chat.primaryBot = null 
    return false
}

async function updateUserName(conn, m, user) {
    try {
        const name = m.pushName || await conn.getName(m.sender)
        if (name && name.trim() && user.name !== name) user.name = name
    } catch {}
}

function handleMessageQueue(m) {
    const queque = this.msgqueque, time = 5000
    const previousID = queque[queque.length - 1]
    queque.push(m.id || m.key.id)
    const interval = setInterval(async () => {
        if (queque.indexOf(previousID) === -1) {
            clearInterval(interval)
            await delay(time)
        }
    }, time)
}

async function finalizeHandler(m) {
    if (opts["queque"] && m.text) {
        const idx = this.msgqueque.indexOf(m.id || m.key.id)
        if (idx !== -1) this.msgqueque.splice(idx, 1)
    }
    
    const user = global.db.data.users[m.sender]
    if (m && m.sender && user) user.exp += (m.exp || 0)

    try {
        if (!opts["noprint"]) {
            const print = (await import("./lib/print.js")).default
            await print(m, this)
        }
    } catch (e) {
        console.warn(e)
    }
}

global.dfail = (type, m, conn) => {
    const msg = {
        rowner: `💙 El comando *${global.comando}* solo puede ser usado por los creadores del bot.`,
        owner: `💙 El comando *${global.comando}* solo puede ser usado por el dueño.`,
        premium: `💙 El comando *${global.comando}* solo puede ser usado por los usuarios premium.`,
        group: `💙 El comando *${global.comando}* solo puede ser usado en grupos.`,
        admin: `💙 El comando *${global.comando}* solo puede ser usado por los administradores del grupo.`,
        botAdmin: `💙 Para ejecutar el comando *${global.comando}* debo ser administrador del grupo.`
    }[type]
    if (msg) return conn.reply(m.chat, msg, m, global.rcanal).then(_ => m.react('💢'))
}

let file = global.__filename(import.meta.url, true)
watchFile(file, async () => {
    unwatchFile(file)
    console.log(chalk.magenta("Se actualizó 'handler.js'"))
    if (global.reloadHandler) console.log(await global.reloadHandler())
})