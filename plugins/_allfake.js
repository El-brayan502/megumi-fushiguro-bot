import { watchFile, unwatchFile } from 'fs'
import moment from 'moment-timezone'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'

let handler = m => m
handler.all = async function (m, { conn }) {

    global.logo = 'https://raw.githubusercontent.com/El-brayan502/img/upload/uploads/6bd2c3-1770600514663.jpg' 
    global.iconorcanal = 'https://raw.githubusercontent.com/El-brayan502/img/upload/uploads/6bd2c3-1770600514663.jpg'

    global.idcanal = '120363417186717632@newsletter' 
    global.nombrecanal = '🐺 megumi fushiguro'

    global.rcanal = {
      contextInfo: {
        isForwarded: true,
        forwardedNewsletterMessageInfo: { newsletterJid: idcanal, serverMessageId: 100, newsletterName: nombrecanal },
        externalAdReply: {
          title: '🎯 fushiguro Updates',
          thumbnailUrl: 'https://chat.whatsapp.com/KAhwtBdTOYlFsbsU8rwo79',
          thumbnail: await (await fetch(global.iconorcanal)).buffer(),
          mediaType: 1,
          renderLargerThumbnail: false
        }
      }
    }

    global.done = '⚽'
    global.error = '⚠️'
    global.rwait = '⏳'

    const time = moment.tz('America/Mexico_City').hour()
    global.saludo = time >= 5 && time < 12 ? '☀️ Buenos días' : time >= 12 && time < 18 ? '🌤️ Buenas tardes' : '🌙 Buenas noches'

    global.fkontak = {
        key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: "status@broadcast" } : {}) },
        message: { contactMessage: { displayName: m.pushName || 'Player', vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;${m.pushName || 'User'};;;\nFN:${m.pushName || 'User'}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Celular\nEND:VCARD` } }
    }
}

export default handler

const file = fileURLToPath(import.meta.url)
watchFile(file, () => {
    unwatchFile(file)
    console.log('✨ Actualizado: _allfeke.js (Bot Edition)')
})