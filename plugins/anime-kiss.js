import fs from 'fs'
import path from 'path'

let handler = async (m, { conn, usedPrefix }) => {
    let who = m.mentionedJid.length > 0 ? m.mentionedJid[0] : (m.quoted ? m.quoted.sender : null)
    let name = who ? (await conn.getName(who)) || who.replace('@s.whatsapp.net', '') : null
    let name2 = m.pushName || (await conn.getName(m.sender)) || m.sender.split('@')[0]

    let str = who
        ? `💙 \`${name2}\` le dio un tierno beso virtual a \`${name}\` como en el mundo mágico de Miku 🎵` 
        : `💙 \`${name2}\` se envió amor a sí mismo/a en el concierto virtual 😘`
    
    if (m.isGroup) {
        let pp = 'https://media.tenor.com/_8oadF3hZwIAAAPo/kiss.mp4'
        let pp2 = 'https://media.tenor.com/cQzRWAWrN6kAAAPo/ichigo-hiro.mp4'
        let pp3 = 'https://media.tenor.com/kmxEaVuW8AoAAAPo/kiss-gentle-kiss.mp4'
        let pp4 = 'https://media.tenor.com/NO6j5K8YuRAAAAPo/leni.mp4'
        let pp5 = 'https://media.tenor.com/xYUjLVz6rJoAAAPo/mhel.mp4'
        let pp6 = 'https://media.tenor.com/ZDqsYLDQzIUAAAPo/shirayuki-zen-kiss-anime.mp4'
        let pp7 = 'https://media.tenor.com/LrKmxrDxJN0AAAPo/love-cheek.mp4'
        let pp8 = 'https://media.tenor.com/lyuW54_wDU0AAAPo/kiss-anime.mp4'
        
        
        const videos = [pp, pp2, pp3, pp4, pp5, pp6, pp7, pp8]
        const video = videos[Math.floor(Math.random() * videos.length)]
        
        conn.sendMessage(m.chat, { video: { url: video }, gifPlayback: true, caption: str, ptt: true, mentions: who ? [who] : [] }, { quoted: m })
    }
}

handler.help = ['kiss']
handler.tags = ['anime']
handler.command = ['kiss', 'besar', 'beso']
handler.group = true
handler.register = true

export default handler
