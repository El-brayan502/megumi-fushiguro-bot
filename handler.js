import { smsg } from "./lib/simple.js"
import { format } from "util"
import { fileURLToPath } from "url"
import path, { join } from "path"
import fs, { unwatchFile, watchFile } from "fs"
import chalk from "chalk"
import fetch from "node-fetch"
import ws from "ws"

const toNum = v => (v + '').replace(/[^0-9]/g, '')
const normalizeCore = v => toNum((v + '').split('@')[0])
const decodeJidCompat = (jid = '') => { 
    if (!jid) return jid
    if (/:[0-9A-Fa-f]+@/.test(jid)) { 
        const [user, server] = jid.split('@')
        return user.split(':')[0] + '@' + server 
    } 
    return jid 
}

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

        const senderRaw = m.sender || ''
        const senderCanonical = decodeJidCompat(senderRaw)
        if (senderCanonical !== m.sender) {
            m.realSender = m.sender
            m.sender = senderCanonical
        }

        const botJid = this.decodeJid(this.user.jid)
        ensureDatabaseSchema.call(this, m, botJid)

        const user = global.db.data.users[m.sender]
        const chat = global.db.data.chats[m.chat]
        const settings = global.db.data.settings[botJid]

        if (typeof m.text !== "string") {
            m.text = (
                m.msg?.conversation || 
                m.msg?.text || 
                m.msg?.caption || 
                (m.message?.extendedTextMessage?.text) || 
                (m.message?.buttonsResponseMessage?.selectedButtonId) || 
                (m.message?.listResponseMessage?.singleSelectReply?.selectedRowId) || 
                (m.msg?.contentText) || 
                ""
            )
        }
        m.text = (m.text || "").trim()

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

        if (m.mentionedJid) {
            m.mentionedJid = m.mentionedJid.map(jid => this.decodeJid(jid))
        }

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
                break 
            }
        }
    } catch (err) {
        console.error(err)
    } finally {
        finalizeHandler.call(this, m)
    }
}

function ensureDatabaseSchema(m, botJid) {
    const sender = this.decodeJid(m.sender)
    if (typeof global.db.data.users[sender] !== "object") global.db.data.users[sender] = {}
    const user = global.db.data.users[sender]
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
        .map(v => normalizeCore(v))

    const senderNum = normalizeCore(m.sender)
    const isROwner = owners.includes(senderNum)
    const isOwner = isROwner || m.fromMe
    const isPrems = isROwner || user.premium || global.prems.some(v => normalizeCore(v) === senderNum)
    const isOwners = [normalizeCore(conn.user.jid), ...owners].includes(senderNum)

    return { isROwner, isOwner, isPrems, isOwners }
}

async function getGroupMetadata(conn, m) {
    if (!m.isGroup) return { participants: [], groupMetadata: {}, userGroup: {}, botGroup: {}, isRAdmin: false, isAdmin: false, isBotAdmin: false }
    
    const metadata = await conn.groupMetadata(m.chat).catch(() => ({}))
    const participants = (metadata.participants || []).map(p => ({ 
        ...p, 
        id: conn.decodeJid(p.id), 
        jid: conn.decodeJid(p.id) 
    }))
    
    const sender = conn.decodeJid(m.sender)
    const botJid = conn.decodeJid(conn.user.jid)
    
    const userGroup = participants.find(p => p.id === sender) || {}
    const botGroup = participants.find(p => p.id === botJid) || {}
    
    return {
        participants,
        groupMetadata: metadata,
        userGroup,
        botGroup,
        isRAdmin: userGroup.admin === "superadmin",
        isAdmin: !!userGroup.admin,
        isBotAdmin: !!botGroup.admin
    }
}

// ... (findPrefixMatch, checkCommand, isRestricted, hasCommandPermissions, getFailType, shouldIgnoreMessage, isMultiBotConflict, updateUserName, handleMessageQueue se mantienen de tu código original)

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
        rowner: `💙 El comando *${global.comando}* solo puede ser usado por los creadores.`,
        owner: `💙 El comando *${global.comando}* solo puede ser usado por el dueño.`,
        premium: `💙 El comando *${global.comando}* solo puede ser usado por usuarios premium.`,
        group: `💙 El comando *${global.comando}* solo puede ser usado en grupos.`,
        admin: `💙 El comando *${global.comando}* solo puede ser usado por los administradores.`,
        botAdmin: `💙 Debo ser administrador para ejecutar este comando.`
    }[type]
    if (msg) return conn.reply(m.chat, msg, m).then(_ => m.react('💢'))
}

let file = global.__filename(import.meta.url, true)
watchFile(file, async () => {
    unwatchFile(file)
    console.log(chalk.magenta("Se actualizó 'handler.js'"))
    if (global.reloadHandler) console.log(await global.reloadHandler())
})
